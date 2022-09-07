---
author: claudiosilva
comments: true
date: "2020-05-28T00:00:00Z"
tags:
- Automation
- dbatools
- Export
- Permissions
- PowerShell
- Replicate
- Scripting
- SQLServer
- syndicated
title: Replicate permissions to new Login/User with dbatools
---
Continuing to share tips and tricks using [dbatools](https://dbatools.io) like the [Refresh databases that belongs to availability group using dbatools](https://claudioessilva.eu/2020/05/20/Refresh-databases-that-belongs-to-Availability-Group-using-dbatools/) posted a few days ago, today I will share a way to export the permissions of a login/user at instance/database level and apply them to a new login/user.

## The typical request

Client: "We have a new colleague, can you please grant them the exact same permissions I have?!"

A quick note/suggestion that may help minimize your work: If we are talking about a Windows Login, please suggest the use of AD groups to help you (so that you don't need to do this process) and also them (they don't need to make this request).

## What are the steps involved in a process like this?

Generally speaking, the quickest way I know is:

1. Get the permissions of the source login/user (For each database because we don't want to miss any permission)
2. Save them to a .sql file
3. Open the file and replace 'srcUser' by 'newUser'
4. Execute

## A (boring) life before dbatools - how to do it

I did a quick poll on Twitter to know how people handled it before dbatools existed. Maybe they still use that process. That is OK :-) but maybe I can help change the way they do it with [this post](https://twitter.com/ClaudioESSilva/status/1265676570544484352).

In  my case the votes goes to '1 or more T-SQL scripts'. At the time it wasn't that hard. Of course if we compare with today's options/tools...that was hard. However, it was what I knew and felt comfortable with.

## The life with dbatools - a better life

In dbatools (v1.0.111) we have 20 Export-Dba* commands.
![dbatools-export-commands](/img/2020/05/dbatools-export-commands.png)

Two of them are related with the login and user permissions.
`Export-DbaLogin` and `Export-DbaUser` (Rob Sewell ([T](https://twitter.com/sqldbawithbeard)) wrote about this last one on his blog post [Export SQL User Permissions to T-SQL script using PowerShell and dbatools](https://sqldbawithabeard.com/2017/04/10/export-sql-user-permissions-to-t-sql-script-using-powershell-and-dbatools/) back in 2017.

You may be familiar with these ones to export/backup user permissions and, for example, run it again after a database refresh.

Back to our specific request of replicating permissions, let's see a couple of options.

### User database level permissions

This will run through all databases. If you just need to run from a couple of them, add the `-Database` parameter on the `Export-DbaUser`.

``` powershell
$sqlInstance = "<yourInstance>"
$existingUser = "<srcUser>"
$newUser = "<newUser>"
$permissionsFile = "D:\temp\ExistingUserPermissions.sql"
$permissionsFileNewUser = "D:\temp\NewUserPermissions.sql"

# Because -replace takes a regular expression, we need to escape the '\' when dealing with windows logins

$existingUserToSearch = $existingUser -replace '\\', '\\'

# Export the user from every database and its permissions at database-roles and object level

Export-DbaUser -SqlInstance $sqlInstance -User $ExistingUser -FilePath $permissionsFile

((Get-Content $permissionsFile -Raw) -replace ($existingUserToSearch, $newUser)) | Set-content $permissionsFileNewUser
```

And now you can open the new user script, check and execute it on the instance.

### That's cool! But, what if I also want the login and instance level permissions?

With a couple of small changes we can get it done.
NOTE: Here I'm assuming the login and user have the same name.

``` powershell
$sqlInstance = "<yourInstance>"
$existingLoginUser = "<srcLoginUser>"
$newLoginUser = "<newLoginUser>"
$permissionsFileLogin = "D:\temp\ExistingLoginPermissions.sql"
$permissionsFileUser = "D:\temp\ExistingUserPermissions.sql"
$permissionsFileNewLoginUser = "D:\temp\NewLoginUser.sql"

# Because -replace takes a regular expression, we need to escape the '\' when dealing with windows logins

$existingLoginUserToSearch = $existingLoginUser -replace '\\', '\\'

# Export the login and its server-roles, server-level and database-level permissions

Export-DbaLogin -SqlInstance $sqlInstance -Login $existingLoginUser -FilePath $permissionsFileLogin

# Export the user from every database and its permissions at database-roles and object level

Export-DbaUser -SqlInstance $sqlInstance -User $existingLoginUser -FilePath $permissionsFileUser

# Replaces:

# Replaces:

# 1 - Replace the login/username by the new one# Replaces:

# 1 - Replace the login/username by the new one
((Get-Content $permissionsFileLogin, $permissionsFileUser -Raw) -replace ($existingLoginUserToSearch, $newloginuser)) -Replace '(, SID[^,]*)', ' ' | Set-content $permissionsFileNewLoginUser
```

And then, you can open the new script `NewLoginUser.sql`, check and execute it on the instance.

### Bonus option - File free

In the last few weeks I have had some questions about this method, if it is possible and how.
The question is "What if you don't want/need to save/keep the SQL file on the file system?"
`-PassThru` parameter for the rescue. This way we will do it all "in-memory".

Using again the example with database level permissions

``` powershell
$sqlInstance = "<yourInstance>"
$existingUser = "<srcUser>"
$newUser = "<newUser>"

$ExportedUser = Export-DbaUser -SqlInstance $sqlInstance -User $existingUser -PassThru

$NewUserPermissions = $ExportedUser -replace $($existingUser -replace '\\', '\\'), $newUser

# Copy the permission to the clipboard. Paste on your query editor and paste there.

$newUserPermissions | Set-Clipboard
```

Did you notice the `-PassThru` at the end of line 5? This will put output on the $ExportedUser permissions.
Finally, on line 10, it will put on your clipboard the whole script after the replace is done.

### “I like it...but can I avoid opening an IDE to run the query? Can dbatools also help here?”

Yes! However, here we have a caveat but we also have two possible workarounds.

The `Invoke-DbaQuery` is our command to run queries. Yet, it isn't dealing "correctly" with scripts with multiple statements divided by GO.

#### Here is two different workarounds to run scripts with multiple statements divided by GO batch separator

Workaround #1 - Remove the 'GO's from script

``` powershell

# This will replace the exact word GO by empty space

$scriptWithoutGO = (Get-Content $permissionsFileNewLoginUser -Raw) -replace '\bGO\b', ' '

# Or if it's from the variable that's in memory

# Or if it's from the variable that's in memory

#$scriptWithoutGO = $NewUserPermissions -replace '\bGO\b', ' '

# Run the script using Invoke-DbaQuery

Invoke-DbaQuery -SqlInstance $sqlInstance -Query $scriptWithoutGO
```

Workaround #2 - With this approach you can keep the GO batch separator. It's the similar of what we do manually when running within SSMS/ADS

``` powershell

# Workaround #2 - Run the changed script using the ExecuteNonQuery method

$sqlInst = Connect-DbaInstance $sqlInstance

# Get content from file

$script = Get-Content $permissionsFileNewLoginUser -Raw

# Or if it's from the variable that's in memory

# Or if it's from the variable that's in memory
#$script = $NewUserPermissions

$sqlInst.Databases["master"].ExecuteNonQuery($script)
```

## Final note

Are you using dbatools to accomplish this process and you found that some permissions are not being scripted out? Maybe it's new object permission that it's not being covered yet. Please [fill an issue on our GitHub repository](http://dbatools.io/issues) so we can help.

## Wrap up

Have I said before that dbatools can help us in many ways?
Sometimes the process that we want to accomplish needs more than one command, a.k.a a script. Write once, test and re-use them! Leverage on the power of the automation.

Thanks for reading!
