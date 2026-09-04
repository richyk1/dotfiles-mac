Fix Linear ticket #$ARGUMENTS following our coding standards.
You will first fetch information about the ticket using Linear MCP and figure out exactly what the problem is related to the code in the project. Any uncertainties will be asked as question to the developer for clarification. After you've gathered the neccesary context, you will check the labels that the issues has assigned, if it has none, you will assign the issue label(s) depending on what type of task you will be facing. 
The problem at hand will be fixed and afterwards the any and all warnings and errors will be fixed when performing "pnpm lint".
Once the Linear task is completed the agent tells briefly what was accomplished. The message ends with a recommended commit message for the developer to use. This commit message has to include the magic words that will trigger Linear to close the issue (see Linear documentation for that).
You are not allowed to change the themes.ts file.
Get to work and ultrathink.



