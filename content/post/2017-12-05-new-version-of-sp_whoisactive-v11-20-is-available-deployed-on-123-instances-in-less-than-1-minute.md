---
author: claudiosilva
comments: true
date: "2017-12-05T00:00:00Z"
tags:
- dbatools
- performance
- PowerShell
- sp_WhoIsActive
- sql tools
- SQLServer
- syndicated
- Troubleshoot
title: New version of sp_WhoIsActive (v11.20) is available - Deployed on 123 instances
  in less than 1 minute
---
Last night, I received Adam Machanic's ([b</a> \| <a href="https://twitter.com/AdamMachanic" target="_blank" rel="noopener">t](http://dataeducation.com)) newsletter "Announcing sp_whoisactive v11.20: Live Query Plans".

For those who don't know about it, [sp_WhoIsActive](http://whoisactive.com) is a stored procedure that provides detailed information about the sessions running on your SQL Server instance.
It is a great tool when we need to troubleshoot some problems such as long-running queries or blocking. (**just** two examples)

This stored procedure works on any version/edition since SQL Server 2005 SP1. Although, you only will be able to see the new feature (live query plans) if you run it on SQL Server 2016 or 2017.

If you don't receive the newsletter you can read this announcement [here](http://mailchi.mp/535acca9903f/announcing-sp_whoisactive-v1120-live-query-plans) and subscriber to receive the next ones [here](http://whoisactive.com/downloads/).

You can read the release notes on the [download page](http://whoisactive.com/downloads/).

Thank you, Adam Machanic!

### The show off part

Using the [dbatools](https://dbatools.io) open source PowerShell module I can deploy the new latest version of the stored procedure.

By running the following two lines of code, I updated my `sp_WhoIsActive` to the latest version (we always download the newest one) on my 123 instances in less than one minute (to be precise, in 51,717 seconds).

``` powershell
$SQLServers = Invoke-DbaQuery -SqlInstance "CentralServerName" -Query "SELECT InstanceConnection FROM CentralDB.dbo.Instances" | Select-Object -ExpandProperty InstanceConnection
Install-DbaWhoIsActive -SqlInstance $SQLServers -Database master
```

The first line will retrieve from my central database all my instances' connection string.
The second one will download the latest version, and compile the stored procedure on the master database on each of the instances in that list (123 instances).

Thanks for reading
