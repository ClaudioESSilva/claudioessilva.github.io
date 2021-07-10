---
layout: post
title: dbatools v1.0? It's available - Check it out!
date: 2019-06-19 07:15
author: claudiosilva
comments: true
tags: [community, Contribute, dbatools, PowerShell, SQLServer, syndicated]
---
Dear reader, before continue please open a PowerShell console and run the following command:
``` powershell
Install-Module -Name dbatools
```

If you are doing this on the date of this blog post, you have just installed dbatools v1.0!

After more than 200 commits, the work of more than 20 contributors and 20 days since the last published version, <a href="">dbatools v1.0</a> is live!

<strong>To all of you that have contributed direct or indirectly to the module a big thank you!</strong>

<h2>Fun fact</h2>

I'm sure this was one of the longest periods without releasing new versions since <a href="https://dbatools.io/devops/">we started doing it more often</a>.
Bare minimum has been 1 release per week :-)

But, there are good reasons for it! v1.0 brings
- Standardised code - parameters names / output
- Code cleanup
- More tests
- Azure connections supported
- And of course, fixes and new (13) commands.

You can read the <a href="https://github.com/sqlcollaborative/dbatools/blob/prerelease/changelog.md">v1.0 change log</a> for more details.

<h2>New commands</h2>

From the 13 new commands, I decided to share the ones that make it possible to interact with Server/Database roles.

Here is the list of the newest commands:
- <a href="https://dbatools.io/Add-DbaDbRoleMember">Add-DbaDbRoleMember</a>
- <a href="https://dbatools.io/Get-DbaDbRole">Get-DbaDbRole</a>
- <a href="https://dbatools.io/New-DbaDbRole">New-DbaDbRole</a>
- <a href="https://dbatools.io/New-DbaInstanceRole">New-DbaInstanceRole</a>
- <a href="https://dbatools.io/Remove-DbaDbRole">Remove-DbaDbRole</a>
- <a href="https://dbatools.io/Remove-DbaDbRoleMember">Remove-DbaDbRoleMember</a>
- <a href="https://dbatools.io/Remove-DbaInstanceRole">Remove-DbaInstanceRole</a>

Note: Database Application Roles are not covered yet.
Note2: A new command to add logins to one (or more) server role is being cooked.
This is why we release often, improvements and new features are always on our pipeline.

<h2>Code examples</h2>

Here is a short script that shows how you can leverage these new commands.
Don't forget to use `Get-Help` or visit our <a href="https://docs.dbatools.io">docs page</a> to know more about the commands.

``` powershell
$instance = &quot;sql2016&quot;
$login = &quot;domain\user&quot;
$newServerRole = &quot;securityMaster&quot;
$defaultExistingServerRole = &quot;sysadmin&quot;

$database = &quot;db1&quot;
$username = $login
$newDatabaseRole = &quot;SPExecutor&quot;

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

<h2>Wrap up</h2>

Even though this is a milestone for us, we will keep working on the module bringing more awesomeness to it!

We want to hear from you!
If you have questions, suggestions, requests or you just want to give a shout out to the team you can:
- <a href="http://dbatools.io/issues">Request a feature or report a bug</a>
- <a href="https://dbatools.io/slack/">Join #dbatools channel on Slack SQL Community</a>
- Find us on <a href="https://twitter.com/psdbatools">Twitter - @psdbatools</a>

Other useful links:
- <a href="https://dbatools.io">Website</a> and <a href="https://dbatools.io/blog/">blog</a>
- <a href="https://dbatools.io/commands">Command list</a> and <a href="https://docs.dbatools.io">documentation</a>

<h3>To celebrate the launch of v1.0 we have a lot of blog posts related to it!</h3>

<a href="https://dbatools.io/dbatools10">dbatools 1.0 has arrived by Chrissy</a>
<a href="https://nocolumnname.blog/?p=9452">dbatools 1.0 - the tools to break down the barriers - Shane O'Neill</a>
<a href="https://dbaduck.com/2019/06/18/dbatools-1-0-is-here-and-why-you-should-care/">dbatools 1.0 is here and why you should care - Ben Miller</a>
<a href="https://corrick.io/blog/dbatools-to-v1-0-and-beyond">dbatools 1.0 and beyond - Joshua Corrick</a>
<a href="https://nakedpowershell.blogspot.com/2019/06/dbatools-10.html">dbatools 1.0 - Dusty R</a>
<a href="https://wp.me/p8gE30-br">Your DBA Toolbox Just Got a Refresh - dbatools v1.0 is Officially Available!!! - Garry Bargsley</a>
<a href="https://ifexists.blog/updating-sql-server-instances-using-powershell/">updating sql server instances using dbatools 1.0 - Gareth N</a>

Enjoy dbatools v1.0!

Thanks for reading!
