---
author: claudiosilva
comments: true
date: "2019-06-19T00:00:00Z"
tags:
- community
- Contribute
- dbatools
- PowerShell
- SQLServer
- syndicated
title: dbatools v1.0? It's available - Check it out!
---
Dear reader, before continue please open a PowerShell console and run the following command:
``` powershell
Install-Module -Name dbatools
```

If you are doing this on the date of this blog post, you have just installed dbatools v1.0!

After more than 200 commits, the work of more than 20 contributors and 20 days since the last published version, <a href="">dbatools v1.0</a> is live!

<strong>To all of you that have contributed direct or indirectly to the module a big thank you!</strong>

## Fun fact

I'm sure this was one of the longest periods without releasing new versions since [we started doing it more often](https://dbatools.io/devops/).
Bare minimum has been 1 release per week :-)

But, there are good reasons for it! v1.0 brings
- Standardised code - parameters names / output
- Code cleanup
- More tests
- Azure connections supported
- And of course, fixes and new (13) commands.

You can read the [v1.0 change log](https://github.com/sqlcollaborative/dbatools/blob/prerelease/changelog.md) for more details.

## New commands

From the 13 new commands, I decided to share the ones that make it possible to interact with Server/Database roles.

Here is the list of the newest commands:
- [Add-DbaDbRoleMember](https://dbatools.io/Add-DbaDbRoleMember)
- [Get-DbaDbRole](https://dbatools.io/Get-DbaDbRole)
- [New-DbaDbRole](https://dbatools.io/New-DbaDbRole)
- [New-DbaInstanceRole](https://dbatools.io/New-DbaInstanceRole)
- [Remove-DbaDbRole](https://dbatools.io/Remove-DbaDbRole)
- [Remove-DbaDbRoleMember](https://dbatools.io/Remove-DbaDbRoleMember)
- [Remove-DbaInstanceRole](https://dbatools.io/Remove-DbaInstanceRole)

Note: Database Application Roles are not covered yet.
Note2: A new command to add logins to one (or more) server role is being cooked.
This is why we release often, improvements and new features are always on our pipeline.

## Code examples

Here is a short script that shows how you can leverage these new commands.
Don't forget to use `Get-Help` or visit our [docs page](https://docs.dbatools.io) to know more about the commands.

``` powershell
$instance = "sql2016"
$login = "domain\user"
$newServerRole = "securityMaster"
$defaultExistingServerRole = "sysadmin"

$database = "db1"
$username = $login
$newDatabaseRole = "SPExecutor"

### Create

# Create new login and set default database
New-DbaLogin -SqlInstance $instance -Login $login -DefaultDatabase $database

# Create new server role
New-DbaInstanceRole -SqlInstance $instance -ServerRole $newServerRole

# Create new database user
New-DbaDbUser -SqlInstance $instance -Database $database -Username $username -Login $login

# Create new database role
New-DbaDbRole -SqlInstance $instance -Database $database -Role $newDatabaseRole

# Add new user to the newly created database role
Add-DbaDbRoleMember -SqlInstance $instance -Database $database -User $username -Role $newDatabaseRole


### Now using Get-Dba*Role*

# Get all members of an role (or list of roles)
Get-DbaInstanceRoleMember -SqlInstance $instance -ServerRole $defaultExistingServerRole | Format-Table -AutoSize


# Get newly create server role 'securityMaster' and defaul existing role 'sysadmin'
Get-DbaInstanceRole -SqlInstance $instance -ServerRole $newServerRole, $defaultExistingServerRole


### Database level

# Get newly creted 'SPExecuter' role
Get-DbaDbRole -SqlInstance $instance -Database $database -Role $newDatabaseRole

# Get all users member of an role (or list of roles)
Get-DbaDbRoleMember -SqlInstance $instance -Database $database -Role $newDatabaseRole


### Clean up

# Remove user from database role
Remove-DbaDbRoleMember -SqlInstance $instance -Database $database -Role $newDatabaseRole -User $username

# Remove role from database
Remove-DbaDbRole -SqlInstance $instance -Database $database -Role $newDatabaseRole

# Remove server role from instance
Remove-DbaInstanceRole -SqlInstance $instance -ServerRole $newServerRole
```

Hope you found them as useful as we did!

## Wrap up

Even though this is a milestone for us, we will keep working on the module bringing more awesomeness to it!

We want to hear from you!
If you have questions, suggestions, requests or you just want to give a shout out to the team you can:
- [Request a feature or report a bug](http://dbatools.io/issues)
- [Join #dbatools channel on Slack SQL Community](https://dbatools.io/slack/)
- Find us on [Twitter - @psdbatools](https://twitter.com/psdbatools)

Other useful links:
- [Website](https://dbatools.io) and [blog](https://dbatools.io/blog/)
- [documentation](https://docs.dbatools.io)

### To celebrate the launch of v1.0 we have a lot of blog posts related to it!

[dbatools 1.0 has arrived by Chrissy](https://dbatools.io/dbatools10)
[dbatools 1.0 - the tools to break down the barriers - Shane O'Neill](https://nocolumnname.blog/?p=9452)
[dbatools 1.0 is here and why you should care - Ben Miller](https://dbaduck.com/2019/06/18/dbatools-1-0-is-here-and-why-you-should-care/)
[dbatools 1.0 and beyond - Joshua Corrick](https://corrick.io/blog/dbatools-to-v1-0-and-beyond)
[dbatools 1.0 - Dusty R](https://nakedpowershell.blogspot.com/2019/06/dbatools-10.html)
[Your DBA Toolbox Just Got a Refresh - dbatools v1.0 is Officially Available!!! - Garry Bargsley](https://wp.me/p8gE30-br)
[updating sql server instances using dbatools 1.0 - Gareth N](https://ifexists.blog/updating-sql-server-instances-using-powershell/)

Enjoy dbatools v1.0!

Thanks for reading!
