---
layout: post
title: dbatools - Exceptions
date: 2022-06-07 14:00
author: claudiosilva
comments: true
tags: [dbatools, Exceptions, Logging, PowerShell, SQLServer, syndicate]
---

Who doesn't like a good red and verbose exception?

![Exceptions_see_of_read_WinPS](/img/2022/06/Exceptions_see_of_read_WinPS.png)

At PowerShell community we often call it a "sea of red" which we found as something that can be intimidatting. The bigger the error message the more problematic it is? :-)

We don't think so! That's why we, within dbatools project, try to keep the output of the exceptions more user friendly and try to give the direct error message to you. No line numbers or stack traces to confuse you.

## The default behavior
By default we hide those bigger, red and ugly error messages in favor of more useful, attractive and user-friendly ones with just the actual error text in a (yellow) warning format - identical to what you can get when using native `Write-Warning` CmdLet.

Within dbatools, if you want to have the default PowerShell look and feel error output, you will need to use the `-EnableException` parameter when calling the commands.

The only command where this doesn't work like that by default is for `Connect-DbaInstance`. This commands by default will shows the red message. But, if you don't want it you can use the `-DisableException` parameter.

### "Why?" You may ask.
This was, in the earlier days, an internal command that others wanted us to surface and we expected they’d want it to throw by default in their own scripts.


## Making it better - PowerShell Core - Improvement
If you have played with both [Windows PowerShell](https://docs.microsoft.com/en-us/powershell/scripting/windows-powershell/starting-windows-powershell?view=powershell-5.1) and [PowerShell Core](https://docs.microsoft.com/en-us/powershell/scripting/overview?view=powershell-7.2), you may recognize the big difference on the default output for the error messages.
With PowerShell Core the errors are shown, by default, in a more consice and nicer view.

Here is an example when calling `Connect-DbaInstance` dbatools function.
Windows PowerShell:
![Exceptions_WinPS_DefaultError_view](/img/2022/06/Exceptions_WinPS_DefaultError_view.png)

Take a look on the same error but when using PowerShell Core
![Exceptions_PSCore_DefaultError_view](/img/2022/06/Exceptions_PSCore_DefaultError_view.png)

NOTE: You can change the default behavior of the preference variable [$ErrorView](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables?view=powershell-7.2#errorview) and play along with [Get-Error](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-error?view=powershell-7.2) CmdLet.


## How do we do it?
dbatools was born before PowerShell Core.  
We were looking forward to have some better error handling along side with a better logging system and we were affortunate to have [Friedrich Weinmann](https://github.com/FriedrichWeinmann) on the team helping with his enormous PS/C# knowledge.

Fred created an internal CmdLet for dbatools called [`Write-Message`](https://github.com/dataplat/dbatools/blob/development/bin/projects/dbatools/dbatools/Commands/WriteMessageCommand.cs) to handle messages and logging.

If you explore dbatools' functions you will find lot's of `Write-Message` entries but also [`Stop-Function`](https://github.com/dataplat/dbatools/blob/development/internal/functions/flowcontrol/Stop-Function.ps1) which is the responsible to interrupt a function.

As stated on the description:
> This function is a utility function used by other functions to reduce error catching overhead.
It is designed to allow gracefully terminating a function with a warning by default and also allow opt-in into terminating errors.

### That means no Write-Verbose/Warning/Error in the commands?
Correct! The function `Write-Message` process the message (by type) and send it to the corresponding dbatools log and outputs it to the PowerShell [output streams](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_output_streams?view=powershell-7.2).


## What if I'm curious about the details of the error message?
As mentioned before you can use the `-EnableException` parameter to get more details.

If you feel this is not yet enough or you need to dig a bit more on the stack trace, we have a command called `Get-DbatoolsError` that allows you to navigate through the errors that happened in the context of dbatools. This will give you more details.

Hope you find it useful and that this helps understanding a little bit more how we handle the exception on dbatools PowerShell module.

Thanks for reading!