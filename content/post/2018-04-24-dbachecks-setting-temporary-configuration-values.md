---
author: claudiosilva
comments: true
date: "2018-04-24T00:00:00Z"
tags:
- dbachecks
- dbatools
- Pester
- PowerShell
- SQLServer
- syndicated
- temporary configuration
title: dbachecks - Setting temporary configuration values
---
[dbachecks](https://dbachecks.io) has seen the light about two months ago. As I'm writing this blog post, the module counts with more than 2600 downloads just from the [PowerShell gallery](https://www.powershellgallery.com/packages/dbachecks).
The module has about 110 configurable checks that make our live easier!

Today I will write about an option that I think users still do not realize that exists.

### The default

dbachecks works with the values previously saved (for that we use `Set-DbcConfig`). This means that when we start a new session and the last session has changed any configuration, that configuration is now, by default, the one that will be used in the new session.

### What about if we want to run a check with a different value just once?!

Today I want to share a different option!

Let's assume that you have your dbachecks configs set up for the Production environment. What do you need to do if you want to change just one check to test it in the Test environment?
One option is use the export/import method that Rob ([b](https://sqldbawithabeard.com/) \| [t](https://twitter.com/sqldbawithbeard)) wrote about on his [dbachecks – Configuration Deep Dive](https://sqldbawithabeard.com/2018/02/22/dbachecks-configuration-deep-dive/) blog post.

## What if, we could change this property just for the current session without messing with possible new sessions?

When we start a new session and we import dbachecks (in matter of fact when the PSFramework is imported - required module for dbachecks to work) we get the values from the registry. This means that we will read whatever is there at that moment.

### Let me introduce to you the `-Temporary` parameter

This parameter is available on `Set-DbcConfig` command. As said before, this command allows us to set a configuration which is, by default, persisted. But, if we use the `-Temporary` parameter we are saying that the configured value is **only available for the current session** the value will not be persisted for future executions, hence, will not mess with other new sessions.

You can run the following code to get the parameter description:

``` powershell
Get-Help Set-DbcConfig -Parameter temporary


![temporaryparameter_helpdescription](/img/2018/03/temporaryparameter_helpdescription.png?w=656)

Here is a demonstration:
https://youtu.be/bVm4yVE5vrk

This video shows that when we don't use the `-Temporary` parameter and we start a new session we will read the last value set up. When we run the command with the `-Temporary` parameter (when setting the value to 5) after start a new session the value read will still be 3.

This way we don't need to export/import the configurations. Perhaps this will save you time when doing some ad-hoc tests and not stay in doubt if you forgot to replace the older values after a different environment test with different configurations.

### I know what you are thinking...

"But I already have and use the export/import method! Changing this can be more work...".
We got that covered! 💪

If you run

``` powershell
Get-Help Import-DbcConfig -Detailed
```

you can see the `-Temporary` is also available in this command.
![gethelp_importdbcconfig_temporaryparameter](/img/2018/04/gethelp_importdbcconfig_temporaryparameter.png?w=656)

Hope this bring some new ideas like making your single, ad-hoc, one-time tests easier to configure!"
I have an idea that I will share on my next post about dbachecks!

## Wrap

`-Temporary` parameter exists on both `Set-DbcConfig` and `Import-DbcConfig` commands.
By using it, you are just changing the values on the current session and won't overwrite the persisted values. This can become in handy in some cases.
Explore it!

Drop a message in the comments section either if you already use it and in which way or if you were not aware that it exists and will give it a spin!

Thanks for reading!
