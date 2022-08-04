---
author: claudiosilva
comments: true
date: "2019-03-29T00:00:00Z"
tags:
- Agent
- Documentation
- Schedule
- SQLServer
- SSMS
- syndicated
title: SSMS GUI not working? Try to use T-SQL!
---
One of the good things, when we have new clients, is that sometimes they have needs that you never heard before.
This does not necessarily mean that they are complex. As a matter of fact, they can be really simple..now the question is..are they doable? :-)

From my experience, this can happen mainly because one of two reasons, they have some very specific need, or because the way the application is built will make you work with features that you haven't played yet.

<h1>SQL Server Agent Job Schedules - Scenario</h1>

The client approached me and asked "Hey, we have an account that is the owner of our jobs, but we would like to use a different account to change the schedule of the job, mainly the start time: is that possible?
As I was not sure about it, I jumped to the documentation.

<h2>First things first</h2>

I double checked that the login they were mentioning had any permissions on the <a href="https://docs.microsoft.com/en-us/sql/relational-databases/databases/msdb-database">msdb database</a>. In this case, the login was already part of one of the <a href="https://docs.microsoft.com/en-us/sql/ssms/agent/sql-server-agent-fixed-database-roles">SQL Server Agent Fixed Database Roles</a>, namely the <a href="https://docs.microsoft.com/en-us/sql/ssms/agent/sql-server-agent-fixed-database-roles#sqlagentoperatorrole-permissions">SQLAgentOperatorRole, which have the following permissions described here</a>.

If we take a look at the 1st row of the grid we can see that a login can change a Job Schedule if they own it.
<img src="https://claudioessilva.github.io/img/2019/03/sqlagentoperatorrole_permissions-1.png" alt="" width="800" height="395" class="aligncenter size-full wp-image-1637" />

<h2>Fair enough, let's try it</h2>

With this information, I was confident that it would work.
To test it, I have created a login, added it to SQLAgentOperatorRole fixed role on the msdb database and had to change the schedule owner.

NOTE: We are talking about schedule owner and not job owner, this are two different things.

To find who is the owner of the schedule we can run the following query:

``` sql
SELECT name, SUSER_SNAME(owner_sid) AS ScheduleOwner
  FROM dbo.sysschedules
```

Then, we need to change the owner to the login we want to use. For this, we should use the [sp_update_schedule](https://docs.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-update-schedule-transact-sql) stored procedure on msdb database using the following code:

``` sql
EXEC msdb.dbo.sp_update_schedule
	@name = 'ScheduleName',
	@owner_login_name = 'NewOwnerLoginName'
```

Now that the login we want to use to change the schedule is the owner of it, the client can connect to the instance using SSMS and this login and edit the schedule, right? Unfortunately no.

<h2>Bug on GUI, or missing detail on documentation?</h2>

I tested on SSMS and the GUI is disabled
<img src="https://claudioessilva.github.io/img/2019/03/editscheduleonsssm_disabled.png" alt="" width="800" height="475" class="aligncenter size-full wp-image-1634" />

I had SSMS v17.3 which is a little bit out of date, so I upgraded to v17.9.1 which is the current GA (General Availability) version but I got the same behaviour. I have also installed the most recent version which is v18.0 preview 7 (by the time of this post) but, then again the same behaviour.

I decided to open a bug item 37230619 on SQL Server UserVoice called <a href="https://feedback.azure.com/forums/908035-sql-server/suggestions/37230619-edit-job-schedule-not-working-when-login-is-the-sc">"Edit Job Schedule not working when login is the schedule owner"</a> that you can upvote here if you agree that this should be fixed.

<h1>Workaround</h1>

Get the schedule id from the list above and you can run the following command (with the login that is the owner of the schedule) in order to change the schedule properties, in this case, the start date, to run at 1am.

``` sql
USE [msdb]
GO
EXEC msdb.dbo.sp_update_schedule @schedule_id=0000,
		@active_start_time=10000
GO
```

I agree that the @active_start_time parameter value is not the most intuitive, but if you look closer it has the format of 'hh:mm:ss' but without the ':' characters and it's a number.
In this example, '01:00:00' is translated to 10000.

At least this way it works. The client was happy to have one way to do it.

<h1>Bottom line</h1>

When the GUI doesn't work, try to script out the action or find what is running behind the hood and run the command manually. Maybe you get a surprise!
