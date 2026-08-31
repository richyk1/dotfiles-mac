// tailscale-coms — peer-to-peer agent-to-agent messaging for omp across machines.
//
// The omp-native analog of the in-process `irc` tool, but over the network: each
// omp instance runs a tiny HTTP listener on its tailscale interface and reaches
// peers by their tailscale IP. No central hub, no pi-coding-agent.
//
// Config: ~/.omp/coms.json (per machine), e.g.
//   {
//     "name": "kiberbook",
//     "bind": "100.98.227.91",
//     "port": 8473,
//     "token": "<shared secret>",
//     "autoRespond": false,
//     "peers": { "milchy": "http://100.124.6.78:8473" }
//   }
//
// Tools registered: coms_list, coms_send, coms_inbox, coms_await.
// Takes effect on the NEXT omp session (extensions load at startup).

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComsMessage {
	id: string;
	from: string;
	to: string;
	text: string;
	replyTo?: string;
	ts: number;
}

export interface ComsConfig {
	name: string;
	bind: string;
	port: number;
	token: string;
	autoRespond: boolean;
	peers: Record<string, string>;
}

export interface PeerStatus {
	name: string;
	url: string;
	online: boolean;
}

export interface ComsSendOptions {
	replyTo?: string;
	awaitReply?: boolean;
	timeoutMs?: number;
	sendTimeoutMs?: number;
}

export interface ComsInboxOptions {
	peek?: boolean;
	from?: string;
}

export interface ComsAwaitOptions {
	timeoutMs?: number;
	from?: string;
}

interface SendOk {
	ok: true;
	id: string;
	reply?: ComsMessage;
}
interface SendErr {
	ok: false;
	error: string;
	id?: string;
}
export type SendResult = SendOk | SendErr;

interface ReplyAwaiter {
	resolve: (message: ComsMessage) => void;
	reject: (reason: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface InboxAwaiter {
	from?: string;
	resolve: (message: ComsMessage | null) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface InboundBody {
	id: string;
	from: string;
	text: string;
	replyTo?: string;
}

// ── Validation (unvalidated network / file input) ───────────────────────────

function isInboundBody(value: unknown): value is InboundBody {
	if (typeof value !== "object" || value === null) return false;
	const o = value as Record<string, unknown>;
	if (typeof o.id !== "string" || typeof o.from !== "string" || typeof o.text !== "string") return false;
	return o.replyTo === undefined || typeof o.replyTo === "string";
}

interface RawConfig {
	name: string;
	bind?: string;
	port?: number;
	token?: string;
	autoRespond?: boolean;
	peers?: Record<string, string>;
}

function isRawConfig(value: unknown): value is RawConfig {
	if (typeof value !== "object" || value === null) return false;
	const o = value as Record<string, unknown>;
	if (typeof o.name !== "string") return false;
	if (o.bind !== undefined && typeof o.bind !== "string") return false;
	if (o.port !== undefined && typeof o.port !== "number") return false;
	if (o.token !== undefined && typeof o.token !== "string") return false;
	if (o.autoRespond !== undefined && typeof o.autoRespond !== "boolean") return false;
	if (o.peers !== undefined) {
		if (typeof o.peers !== "object" || o.peers === null) return false;
		for (const v of Object.values(o.peers as Record<string, unknown>)) {
			if (typeof v !== "string") return false;
		}
	}
	return true;
}

export function loadComsConfig(): ComsConfig | null {
	const path = process.env.OMP_COMS_CONFIG ?? join(homedir(), ".omp", "coms.json");
	if (!existsSync(path)) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return null;
	}
	if (!isRawConfig(parsed)) return null;
	return {
		name: parsed.name,
		bind: parsed.bind ?? "0.0.0.0",
		port: parsed.port ?? 8473,
		token: parsed.token ?? "",
		autoRespond: parsed.autoRespond ?? false,
		peers: parsed.peers ?? {},
	};
}

// ── Transport (pi-independent; unit-testable) ───────────────────────────────

export class ComsTransport {
	readonly name: string;
	readonly bind: string;
	readonly port: number;
	readonly peers: Record<string, string>;
	private readonly token: string;
	private readonly maxInbox = 200;

	private server: Server | undefined;
	private queue: ComsMessage[] = [];
	private readonly replyAwaiters = new Map<string, ReplyAwaiter>();
	private readonly inboxAwaiters = new Set<InboxAwaiter>();

	/** Set by the host to wake the agent on an inbound prompt (auto-respond mode). */
	onPrompt: ((message: ComsMessage) => void) | undefined;

	constructor(config: ComsConfig) {
		this.name = config.name;
		this.bind = config.bind;
		this.port = config.port;
		this.token = config.token;
		this.peers = config.peers;
	}

	start(): Promise<void> {
		const { promise, resolve, reject } = Promise.withResolvers<void>();
		const server = createServer((req, res) => this.handle(req, res));
		server.on("error", reject);
		server.listen(this.port, this.bind, () => {
			this.server = server;
			resolve();
		});
		return promise;
	}

	async stop(): Promise<void> {
		for (const w of this.replyAwaiters.values()) clearTimeout(w.timer);
		this.replyAwaiters.clear();
		for (const a of this.inboxAwaiters) clearTimeout(a.timer);
		this.inboxAwaiters.clear();
		const server = this.server;
		this.server = undefined;
		if (!server) return;
		const { promise, resolve } = Promise.withResolvers<void>();
		server.close(() => resolve());
		await promise;
	}

	async list(): Promise<PeerStatus[]> {
		const checks = Object.entries(this.peers).map(async ([name, url]): Promise<PeerStatus> => {
			try {
				const res = await fetch(`${url}/health`, { headers: this.headers(), signal: AbortSignal.timeout(2500) });
				return { name, url, online: res.ok };
			} catch {
				return { name, url, online: false };
			}
		});
		return Promise.all(checks);
	}

	async send(to: string, text: string, opts: ComsSendOptions = {}): Promise<SendResult> {
		const url = this.peers[to];
		if (!url) return { ok: false, error: `unknown peer: ${to}` };
		const id = randomUUID();

		let replyPromise: Promise<ComsMessage> | undefined;
		if (opts.awaitReply) {
			const { promise, resolve, reject } = Promise.withResolvers<ComsMessage>();
			const timer = setTimeout(() => {
				this.replyAwaiters.delete(id);
				reject(new Error("await reply timeout"));
			}, opts.timeoutMs ?? 120_000);
			this.replyAwaiters.set(id, { resolve, reject, timer });
			replyPromise = promise;
		}

		const body: InboundBody = { id, from: this.name, text, replyTo: opts.replyTo };
		try {
			const res = await fetch(`${url}/inbox`, {
				method: "POST",
				headers: this.headers(),
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(opts.sendTimeoutMs ?? 10_000),
			});
			if (!res.ok) {
				this.cancelReplyAwaiter(id);
				return { ok: false, error: `peer ${to} returned HTTP ${res.status}`, id };
			}
		} catch (err) {
			this.cancelReplyAwaiter(id);
			return { ok: false, error: `delivery to ${to} failed: ${String(err)}`, id };
		}

		if (!replyPromise) return { ok: true, id };
		try {
			const reply = await replyPromise;
			return { ok: true, id, reply };
		} catch (err) {
			return { ok: false, error: String(err), id };
		}
	}

	inbox(opts: ComsInboxOptions = {}): ComsMessage[] {
		const from = opts.from;
		const taken: ComsMessage[] = [];
		const kept: ComsMessage[] = [];
		for (const m of this.queue) {
			if (!from || m.from === from) taken.push(m);
			else kept.push(m);
		}
		if (!opts.peek) this.queue = kept;
		return taken;
	}

	awaitMessage(opts: ComsAwaitOptions = {}): Promise<ComsMessage | null> {
		const from = opts.from;
		const idx = this.queue.findIndex((m) => !from || m.from === from);
		if (idx >= 0) {
			const [m] = this.queue.splice(idx, 1);
			return Promise.resolve(m);
		}
		const { promise, resolve } = Promise.withResolvers<ComsMessage | null>();
		const awaiter: InboxAwaiter = {
			from,
			resolve,
			timer: setTimeout(() => {
				this.inboxAwaiters.delete(awaiter);
				resolve(null);
			}, opts.timeoutMs ?? 600_000),
		};
		this.inboxAwaiters.add(awaiter);
		return promise;
	}

	private cancelReplyAwaiter(id: string): void {
		const w = this.replyAwaiters.get(id);
		if (!w) return;
		clearTimeout(w.timer);
		this.replyAwaiters.delete(id);
	}

	private headers(): Record<string, string> {
		const h: Record<string, string> = { "content-type": "application/json" };
		if (this.token) h.authorization = `Bearer ${this.token}`;
		return h;
	}

	private authorized(req: IncomingMessage): boolean {
		if (!this.token) return true;
		return req.headers.authorization === `Bearer ${this.token}`;
	}

	private readBody(req: IncomingMessage): Promise<string> {
		const { promise, resolve, reject } = Promise.withResolvers<string>();
		let data = "";
		req.on("data", (chunk: Buffer) => {
			data += chunk.toString("utf8");
		});
		req.on("end", () => resolve(data));
		req.on("error", reject);
		return promise;
	}

	private handle(req: IncomingMessage, res: ServerResponse): void {
		if (req.method === "GET" && req.url === "/health") {
			if (!this.authorized(req)) {
				res.writeHead(401);
				res.end("unauthorized");
				return;
			}
			res.writeHead(200, { "content-type": "application/json" });
			res.end(JSON.stringify({ name: this.name }));
			return;
		}
		if (req.method === "POST" && req.url === "/inbox") {
			if (!this.authorized(req)) {
				res.writeHead(401);
				res.end("unauthorized");
				return;
			}
			this.readBody(req)
				.then((raw) => {
					let parsed: unknown;
					try {
						parsed = JSON.parse(raw);
					} catch {
						res.writeHead(400);
						res.end("bad json");
						return;
					}
					if (!isInboundBody(parsed)) {
						res.writeHead(400);
						res.end("bad body");
						return;
					}
					const msg: ComsMessage = {
						id: parsed.id,
						from: parsed.from,
						to: this.name,
						text: parsed.text,
						replyTo: parsed.replyTo,
						ts: Date.now(),
					};
					res.writeHead(200, { "content-type": "application/json" });
					res.end(JSON.stringify({ ok: true }));
					this.deliver(msg);
				})
				.catch(() => {
					res.writeHead(500);
					res.end("error");
				});
			return;
		}
		res.writeHead(404);
		res.end("not found");
	}

	private deliver(msg: ComsMessage): void {
		if (msg.replyTo) {
			const w = this.replyAwaiters.get(msg.replyTo);
			if (w) {
				clearTimeout(w.timer);
				this.replyAwaiters.delete(msg.replyTo);
				w.resolve(msg);
				return;
			}
		}
		// A prompt (not a reply) in auto-respond mode wakes the agent; replies and
		// mailbox-mode prompts fall through to the queue/awaiters.
		if (!msg.replyTo && this.onPrompt) {
			this.onPrompt(msg);
			return;
		}
		for (const a of this.inboxAwaiters) {
			if (!a.from || a.from === msg.from) {
				clearTimeout(a.timer);
				this.inboxAwaiters.delete(a);
				a.resolve(msg);
				return;
			}
		}
		this.queue.push(msg);
		while (this.queue.length > this.maxInbox) this.queue.shift();
	}
}

// ── omp extension factory ───────────────────────────────────────────────────

export default function tailscaleComs(pi: ExtensionAPI): void {
	const z = pi.zod;
	const config = loadComsConfig();
	let transport: ComsTransport | undefined;

	function requireTransport(): ComsTransport {
		if (!transport) throw new Error("coms not running — create ~/.omp/coms.json and restart omp");
		return transport;
	}

	pi.setLabel("Tailscale Coms");

	pi.on("session_start", async (_event, ctx) => {
		if (!config) {
			ctx.ui.notify("[coms] no ~/.omp/coms.json — tailscale-coms idle", "info");
			return;
		}
		if (transport) return;
		const t = new ComsTransport(config);
		if (config.autoRespond) {
			t.onPrompt = (msg) => {
				pi.sendUserMessage(
					`[coms] Peer "${msg.from}" sent (id ${msg.id}):\n${msg.text}\n\n` +
						`To answer, call coms_send with to:"${msg.from}", replyTo:"${msg.id}".`,
					{ deliverAs: "followUp" },
				);
			};
		}
		try {
			await t.start();
			transport = t;
			ctx.ui.notify(`[coms] listening ${config.bind}:${config.port} as "${config.name}"`, "info");
		} catch (err) {
			ctx.ui.notify(`[coms] failed to start: ${String(err)}`, "error");
		}
	});

	pi.on("session_shutdown", async () => {
		await transport?.stop();
		transport = undefined;
	});

	pi.registerTool({
		name: "coms_list",
		label: "Coms: list peers",
		description: "List configured cross-machine peer agents and whether each is reachable on the tailnet.",
		parameters: z.object({}),
		async execute() {
			const peers = await requireTransport().list();
			const text = peers.length
				? peers.map((p) => `${p.online ? "●" : "○"} ${p.name}  ${p.url}`).join("\n")
				: "(no peers configured)";
			return { content: [{ type: "text", text }], details: { peers } };
		},
	});

	pi.registerTool({
		name: "coms_send",
		label: "Coms: send",
		description:
			"Send a message to a peer agent on another machine. Set awaitReply:true to block until the peer replies (it must coms_send back with replyTo set to this message's id).",
		parameters: z.object({
			to: z.string().describe("peer name from coms_list"),
			text: z.string().describe("message body"),
			awaitReply: z.boolean().optional().describe("block until the peer replies"),
			replyTo: z.string().optional().describe("id of the message you are answering"),
			timeoutMs: z.number().optional().describe("await timeout (default 120000)"),
		}),
		async execute(_id, params) {
			const result = await requireTransport().send(params.to, params.text, {
				awaitReply: params.awaitReply,
				replyTo: params.replyTo,
				timeoutMs: params.timeoutMs,
			});
			if (!result.ok) return { content: [{ type: "text", text: `send failed: ${result.error}` }], details: result };
			if (result.reply)
				return {
					content: [{ type: "text", text: `reply from ${result.reply.from}: ${result.reply.text}` }],
					details: { id: result.id, reply: result.reply },
				};
			return { content: [{ type: "text", text: `sent (id ${result.id})` }], details: { id: result.id } };
		},
	});

	pi.registerTool({
		name: "coms_inbox",
		label: "Coms: inbox",
		description: "Drain (or peek) messages received from peers since the last read.",
		parameters: z.object({
			peek: z.boolean().optional().describe("leave messages unread"),
			from: z.string().optional().describe("only this peer"),
		}),
		async execute(_id, params) {
			const msgs = requireTransport().inbox({ peek: params.peek, from: params.from });
			const text = msgs.length
				? msgs.map((m) => `[${m.from}${m.replyTo ? " reply" : ""} ${m.id}] ${m.text}`).join("\n")
				: "(inbox empty)";
			return { content: [{ type: "text", text }], details: { messages: msgs } };
		},
	});

	pi.registerTool({
		name: "coms_await",
		label: "Coms: await",
		description: "Block until a message arrives from a peer (or the timeout fires). Consumes the message.",
		parameters: z.object({
			timeoutMs: z.number().optional().describe("wait timeout (default 600000)"),
			from: z.string().optional().describe("only accept from this peer"),
		}),
		async execute(_id, params) {
			const msg = await requireTransport().awaitMessage({ timeoutMs: params.timeoutMs, from: params.from });
			if (!msg) return { content: [{ type: "text", text: "(timed out, no message)" }] };
			return { content: [{ type: "text", text: `[${msg.from} ${msg.id}] ${msg.text}` }], details: { message: msg } };
		},
	});
}
