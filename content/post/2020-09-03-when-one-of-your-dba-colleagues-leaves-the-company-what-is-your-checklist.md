---
author: claudiosobralsilva
tags:
- BestPractices
- dbatools
- Monitoring
- Permissions
- PowerShell
- Security
- SQLServer
- syndicated
comments: true
date: "2020-09-03T00:00:00Z"
title: When one of your DBA colleagues leaves the company, what is your checklist?
---
Whether it’s in our personal lives or the professional one, we do have checklists for certain tasks.

On the professional level, it can be purely technical like SQL Server installation, configuration or even uninstall, but they can also be not so technical like when a colleague join the team and someone needs to request permissions to access the company's tools (such as ticketing/incidents/VPN/etc).

## What about when a colleague leaves the company?

What is your checklist for this situation?
At first, and the most obvious is to "rollback" the things done when that person joined the company. For instance:

1. Disable AD user
2. Remove from AD groups
3. Delete access to the company's tools

The first step should be enough to make sure that person can't access the systems anymore, however, to do a proper cleanup steps 2 and 3 should also be made.

### Some elements might not be so obvious

For example, think about the SQL Server instance and/or database objects ownership.
It's pretty easy to create a new database for a client without explicitly specifying the owner and then you will become the database owner. The same can happen with SQL Server Agent jobs.

But the list doesn't stop here, just to enumerate a couple more:

- User login can be used in Credential
- User login can be the only used in a Proxy (SQL Agent Steps using a Proxy)

#### What do they have in common?

Sooner or later you will discover that things (might) stop working.

## Let me share a story with you

I had a colleague that worked for a dozen years in the company and was responsible for a lot of the automated processes that we had in place.
Some weeks after that person leaves the company we start to find some "odd" behaviours.
Our process that synchronized our central system with our CMDB (Configuration management database) was not working and some other processes stopped too.
It turns out that even if the person has said that all the jobs' owners were changed, the truth, in this case, was that they weren't.

We found a job that stopped running on the 'View History' of the job we could see the following message

> 'EXECUTE AS LOGIN' failed for the requested login 'domain\username'.  The step failed.

![sqlserveragent_job_errormessage](/img/2020/09/sqlserveragent_job_errormessage-1.png)

Note: What else can we learn from this? Whenever possible use a non-user dedicated account (service account is OK) for these processes. This will make it much easier to keep everything working. However, you need to be sure that the ownership of that account is transferred to a new person, otherwise, this request can be deleted and everything fails anyways.

### How can we make this less painful?

If you have a set of checks in place running regularly using for example [dbachecks.io](https://dbachecks.io/), you will see some red flag after you readjust (remove the login) from the list of "Valid Database Owner" and "Valid Job Owner" check.

However here I will be focusing on how we can use [dbatools](https://dbatools.io) PowerShell module as in this case we are talking about one ad-hoc check.
dbatools has a command called [Find-DbaUserObject](https://docs.dbatools.io/#Find-DbaUserObject) which:

> Searches SQL Server to find user-owned objects (i.e. not dbo or sa) or for any object owned by a specific user specified by the Pattern parameter.

This is even better because we can use a list of instances and check all of them with just one command.

### What will it search?

From the command description we can find the following:

> Looks at the below list of objects to see if they are either owned by a user or a specific user (using the parameter -Pattern)

- Database Owner
- Agent Job Owner
- Used in Credential
- Used in Proxy
- SQL Agent Steps using a Proxy
- Endpoints
- Server Roles
- Database Schemas
- Database Roles
- Database Assembles
- Database Synonyms

### Using the command

To use the command we just need to provide one or more instances where we want to do the search and a login name, which we can even use regex.

``` powershell
Find-DbaUserObject -SqlInstance 'myInstance' -Pattern 'u_ssc'
```

This will find all objects where the login contains 'u_ssc' word. This means if you have a Windows Login and a SQL Server Login with 'u_ssc' on the name, it will get results for both.

![sqlserveragent_job_errormessage](/img/2020/09/find-dbauserobject-1.png)

In this example you can see that this login owns not only our job that has been falling but also a database.

#### Multiple instances

If you suspect that you can find the specific person as the owner on more than one instance, you can just specify the list of instances where you want to search.

``` powershell
Find-DbaUserObject -SqlInstance 'myInstance', 'myOtherInstance' -Pattern 'u_ssc'
```

### How to fix it?

Having this list is nice, but what if it returns dozens of jobs and/or databases where that person is the current owner?

Fortunately, dbatools has commands to do this kind of changes in bulk.

#### Change database owner

For a database, we can run the [Set-DbaDbOwner](https://docs.dbatools.io/#Set-DbaDbOwner) command.

If you don't specify the `-TargetLogin` parameter the database owner will change to the `sa` account

``` powershell
Set-DbaDbOwner -SqlInstance localhost -Database 'db1'
```

However, you can specify the `-TargetLogin` parameter to set the database owner to a different account

``` powershell
Set-DbaDbOwner -SqlInstance localhost -Database 'db1' -TargetLogin 'GEN_Account'
```

#### Change job owner

If we talk about the jobs, we can use the [Set-DbaAgentJobOwner](https://docs.dbatools.io/#Set-DbaAgentJobOwner) command

``` powershell
Set-DbaAgentJobOwner -SqlInstance localhost -TargetLogin 'DOMAIN\account' -Job 'job1', 'job2'
```

The following example lets you get only the jobs where the current owner is `DOMAIN\colleagueLeaving` and pipe the results to the `Set-` command that will change that by the `DOMAIN\account` that you have selected.

``` powershell
Get-DbaAgentJob -SqlInstance localhost | Where-Object OwnerLoginName -eq 'DOMAIN\colleagueLeaving' | Set-DbaAgentJobOwner -TargetLogin 'DOMAIN\account'
```

## Wrap up

If you don't have this "what I need to do when a colleague of my DBA team leaves the company?" yet, I hope you will add it to your checklist to check or double-check if any of its logins have the ownership of any SQL Server objects.

Thanks for reading
