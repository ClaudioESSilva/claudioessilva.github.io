---
layout: post
title: Refresh databases that belongs to Availability Group using dbatools
date: 2020-05-20 09:57
author: claudiosilva
comments: true
tags: [Automation, Availability Groups, Database Refresh, dbatools, PowerShell, recipes, Scripting, SQLServer, syndicated]
---
Few days ago I was surfing on Twitter when <a href="https://twitter.com/psdbatools">dbatools</a> asked about how it's PowerShell module changed the way people work.

https://twitter.com/psdbatools/status/1261563168113012736

Open and check the answers given by the community as there is really good stuff there!

<h2>My turn</h2>

I have shared one of my recipes related to database refreshes. You know, when the client says, "please restore this backup or the most recent backup on our instance.". But what if the databases belong to an availability group? It's not as simple as a standalone installation.

Seconds later, John McCormack (<a href="https://twitter.com/actualjohn">T</a> \| <a href="https://johnmccormack.it/">B</a>) asked if I have blogged about this
https://twitter.com/actualjohn/status/1261605078013747200
The truth is that this blog post was already on the queue, so without further ado, I will share the script I normally use.

<h2>Not so fast - A couple of notes:</h2>

<ul>
<li>Read carefully what each command does as you normally do for every single script you use from the internet. You do that, right? :-)</li>
<li>I have used multiple times but always only on Availability Groups with 2 nodes. </li>
<li>It's written to use automatic seeding. </li>
<li>You can, and you should, run the script command by command in your first try as this will be much easier to understand how it's working.</li>
</ul>

<h3>Variations that you may need</h3>

<ul>
<li>With some changes you can put it to work with Availability Groups with more than 2 nodes. The failover and the set dbowner part is the one that is being done just having 2 nodes in mind. </li>
<li>If you have huge databases and automatic seeding is not an option for you, you may want to leverage on the backup/restore process. Take a look on the <a href="https://docs.dbatools.io/#Add-DbaAgDatabase">Add-DbaAgDatabase</a> command docs (look to `-SharedPath` parameter along with `-SeedingMode Manual`)</li>
</ul>

<h2>The script</h2>

``` powershell
&lt;#
Author: Cláudio Silva
Blog: https://claudioessilva.eu
Twitter: https://twitter.com/claudioessilva
Date: 2020/05/19

.SYNOPSIS
    The goal of this script is to provide an automatic way to refresh one or more databases that belongs to an Availability Group.

.Description
    The script is doing the following major steps
         1 - Get the replicas (Primary and Secondary)
         2 - Export user permissions of the current databases (before dropping them)
         3 - Remove databases from the Availability Group (on primary node)
         4 - Restore the backups with overwrite
            NOTE: Here I left two options:
                - one (the commented) is when the databases on the destination instance have the same name as the origin
                - The 2nd one that will be running assumes that you will need to give a different name to the database on the destination instance.
                  (Example: Database called 'carrots' is 'carrots_PROD' on destination instance)
         5 - Run the script exported on step 2
         6 - Repair orphaned users
         7 - Remove orphaned users
         8 - Remove databases from the secondary node
         9 - Add the restored databases to the availability group using Automatic Seeding
        10 - Set the dbowner of the databases
        11 - Test failover
        12 - Set the dbowner of the databases on this node
        13 - Test failback
#&gt;

$listenerName = &quot;listener&quot;
$availabilityGroupName = &quot;AGName&quot;
$databases = &quot;db1&quot;, &quot;db2&quot; # Add more if you need. Also if using the 2nd method of restore, add there too.
$dboLogin = &quot;dbOwnerLogin&quot;
$exportUserPath = &quot;&lt;Path&gt;\Exported_Users_$availabilityGroupName.sql&quot;
$DestinationDataDirectory = &quot;&lt;pathToYourDataDirectory&quot;
$DestinationLogDirectory = &quot;&lt;pathToYourLogDirectory&quot;
$backupDirectory = &quot;&lt;pathToYourBackups&gt;&quot;

# Get AG replicas
$agReplicas = Get-DbaAgReplica -SqlInstance $listenerName -AvailabilityGroup $availabilityGroupName

# Get current primary node
$primaryNode = ($agReplicas | Where-Object role -eq 'Primary').Name

# Get secondary node
$secondaryNode = ($agReplicas | Where-Object role -eq 'Secondary').Name

# Export users permissions
Export-DbaUser -SqlInstance $sqlinstance -Database $databases -Path $exportUserPath

# Remove the databses from the AG
Remove-DbaAgDatabase -SqlInstance $primaryNode -AvailabilityGroup $availabilityGroupName -Database $databases #-Confirm:$false

# Restore databases with overwrite
# 1 - You can get all backups from a folder pipe to Restore-DbaDatabase and it will do the magic.
# NOTE: This will be useful when the destination database has the same name as the source.
# Get-ChildItem -Path $backupDirectory -Recurse -Filter &quot;*.bak&quot; | Restore-DbaDatabase -SqlInstance $sqlinstance -WithReplace -DestinationDataDirectory $DestinationDataDirectory -DestinationLogDirectory $DestinationLogDirectory

# 2 - If you need to restore the database with a different name, you may prefer to specify each -Database name from the specific backup
# NOTE: This will keep the database name.
Restore-DbaDatabase -SqlInstance $primaryNode -DatabaseName 'db1' -Path &quot;$backupDirectory\db1.bak&quot; -WithReplace -DestinationDataDirectory $DestinationDataDirectory -DestinationLogDirectory $DestinationLogDirectory
Restore-DbaDatabase -SqlInstance $primaryNode -DatabaseName 'db2' -Path &quot;$backupDirectory\db2.bak&quot; -WithReplace -DestinationDataDirectory $DestinationDataDirectory -DestinationLogDirectory $DestinationLogDirectory

# Put the permissions back
# Note: We need to replace the 'GO' batch separator as Invoke-DbaQuery will do this split and send execution one-by-one. This means that a database context change works but then next command will probably be run on master
Invoke-DbaQuery -SqlInstance $primaryNode -Query $((Get-Content $exportUserPath) -replace '\bGO\b', ' ')

# Repair Orphan Users
Repair-DbaDbOrphanUser -SqlInstance $primaryNode -Database $databases

# Remove Orphan Users
Remove-DbaDbOrphanUser -SqlInstance $primaryNode -Database $database

# Remove databases from the secondary instance
Remove-DbaDatabase -SqlInstance $secondaryNode -Database $databases #-Confirm:$false

# Add databases to the AG using 'Automatic' option for -SeedingMode parameter
Add-DbaAgDatabase -SqlInstance $primaryNode -AvailabilityGroup $availabilityGroupName -Database $databases -SeedingMode Automatic #-Confirm:$false

# Change database owner on the primary
Set-DbaDbOwner -SqlInstance $primaryNode -Database $databases -TargetLogin $dboLogin

# Failover the AG so we can set database DB
Invoke-DbaAgFailover -SqlInstance $secondaryNode -AvailabilityGroup $availabilityGroupName

# Change database owner
Set-DbaDbOwner -SqlInstance $secondaryNode -Database $databases -TargetLogin $dboLogin

# Failover back if wanted/needed
Invoke-DbaAgFailover -SqlInstance $primaryNode -AvailabilityGroup $availabilityGroupName
```

<h3>What do you need to change</h3>

1 - Fill the variable values from lines 27 to 34.
2 - Select your method of restore / seeding. Lines 51 to 59.

<h2>Same task but not for databases within Availability Groups</h2>

With this script as a starting point you can adapt to do refreshes of databases that work on single instances.

<h2>Wrap up</h2>

I hope you find it useful.
As a time metric I can tell you that (excluding restores/seeding) all the other actions took me about 15min to run manually with a lot of possible things to go wrong. Now it takes me 5min or less.

If you are facing difficulties, drop a comment.

Thanks for reading!
