---
author: claudiosilva
comments: true
date: "2018-04-26T00:00:00Z"
tags:
- dbachecks
- dbatools
- Monitoring
- performance
- Pester
- PowerShell
- SQLServer
- syndicated
- Tests
title: dbachecks - Going parallel - Cut off your execution times
---
On one of the last clients I have worked, I have implemented [dbachecks](http://dbachecks.io) in order to get the state of art and know how cool or bad the environments are before start knocking down the bad practices.

This client has **seven** different environments with more than 100 instances and more than 2000 databases.

### Serial execution

A non-parallel execution (single session) took more than 2 hours.
This is not a big problem when we run it out of hours and we don't want/need to be looking or waiting for it to finish.
I set up it to run at 6 in the morning and when I arrive at the office I can refresh the Power BI dashboard a get a recent state of art.

Well, 2 hours seems not too much if we [compare with some other dbachecks users](https://twitter.com/HiramFleitas/status/983361997843632128)

What if we want to lower down that 2 hours execution? Or the Hiram Fleitas' ([b](https://dba2o.wordpress.com/) \| [t](https://twitter.com/HiramFleitas)) 4,6 hours?

### Going parallel

First let me remember that **this doesn't come for free**! I mean, if you set multiple checks in parallel (different sessions), you will consume more resources (CPU, memory, etc) on the machine where you are running them. Test the process and find a reasonable limit for it, otherwise this can become slower that the serial execution.

#### This brought some new needs

By default, dbachecks works with the values previously saved (for that we use `Set-DbcConfig` or the `Import-DbcCheck`). This means when we start a new session and the last session have changed any configuration, that configuration is the one that will be used in the new session.

#### Can you see the problem?

Imagine that I want to check for databases in Full Recovery Model on the production environment and I want to start (in parallel) a new check for the development environment where I want to check for Simple Recovery Model if this setting is not changed in the correct time frame, we can end checking for Full Recovery Model on the development environment where we want the Simple Recovery Model.

The first time I tried to run tests for some environments in parallel, that had the need to change some configs, I didn't realise about this detail so I ended up with much more failed tests than the expected! The bell rang when the majority of the failed tests were from a specific test...the one I had changed the value.

### `-Temporary` parameter for the rescue!

On my last dbachecks blog post - [dbachecks – Setting temporary configuration values](http://claudioessilva.eu/2018/04/24/dbachecks-Setting-temporary-configuration-values/) I have explained how this works so if you haven't read it yet, take a look before continuing.

Ok, now that you know you can use the `-Temporary` to run the tests without interfering with the persisted, you may already notice what we will do next..

### My recipe to run in parallel

Disclaimer: First, let me say that this is just one option you can come up with a different one. Please drop a comment so I, and others, can become aware of different approaches.

* If you don't have a configuration file for the environment yet, start by configuring all the settings and use `Export-DbcConfig` to save them.
* You need to do a split of your instances/hosts in one or more groups that can share the exact same configurations.
* Start a new powershell session, set (using `Set-DbcConfig`) or import (using `Import-DbcConfig`) your configurations (set up on number 1) but **don't forget to use the `-Temporary` parameter**.
* Run the `Invoke-DbcCheck`
* Repeat steps 1, 2 and 3 as many times as you want - I encourage you to start with just 2 sessions and monitoring your computer resources. Then if you still have room, add one more.
* Grab a coffee, a beer or any other drink of your choice and wait until it finishes.

Again, take a look on your resources and then you can test with one more session. Do it until you find the sweet number of parallel sessions.

Here is the code you can use:
For 1st point:

``` powershell

#PROD environment

Set-DbcConfig -Name policy.recoverymodel.type -Value Full -Temporary
Export-DbcConfig -Path "D:\dbachecks\Prod_Configs.json"
```

``` powershell

#DEV environment

Set-DbcConfig -Name policy.recoverymodel.type -Value Simple -Temporary
Export-DbcConfig -Path "D:\dbachecks\Dev_Configs.json"
```

2nd, 3rd and 4th point together:

``` powershell

#PROD instances

$sqlInstances = "prod1", "prod2", "prod3"

#Import Prod_Configs.json with -Temporary

Import-DbcConfig -Path "D:\dbachecks\Prod_Configs.json" -Temporary

#Run the checks - Don't forget to add all the parameters you usually use

Invoke-DbcCheck -SqlInstance $sqlInstances
```

``` powershell

#DEV instances

$sqlInstances = "dev1", "dev2", "dev3"

#Import Dev_Configs.json with -Temporary

Import-DbcConfig -Path "D:\dbachecks\Dev_Configs.json" -Temporary

#Run the checks - Don't forget to add all the parameters you usually use

Invoke-DbcCheck -SqlInstance $sqlInstances
```

Save this scripts in two different ps1 files. Then, open two different PowerShell sessions and call each script on different session. Let it flow :-)

### Results

On my case I was able to drop from 2 hours to about 1 hour with 3 parallel sessions. Adding a 4th session made the whole process slower.

## Wrap

We saw that we may have problems if we try to run more than one dbachecks session when using different configured values. Using `-Temporary` parameter when setting the values come in handy for this scenario.
This way we can run two or more sessions in parallel and each one on different environments without messing each other and hopefully, cut off our execution times.

Hope this helps! I would love to hear if you were able to drop down your execution times and what they are before and after.

Thanks for reading!
