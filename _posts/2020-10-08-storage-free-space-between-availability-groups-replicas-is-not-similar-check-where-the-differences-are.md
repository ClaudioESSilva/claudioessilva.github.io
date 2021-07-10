---
layout: post
title: Storage free space between Availability Groups' replicas is not similar? Check where the differences are.
date: 2020-10-08 20:47
author: claudiosobralsilva
comments: true
categories: [dbachecks, dbatools, Infrastructure, Monitoring, PowerShell, SQLServer, syndicated]
---
A colleague was doing an analysis on a client system (with Always On Availability Groups) where he was preparing some database movements.

He found some strange differences between the mount points on both servers

[code language="PowerShell"]
Get-DbaDiskSpace -ComputerName REPLICA1, REPLICA2 | Where-Object Label -like '*Data*' | Sort-Object Label
[/code]

<img src="https://claudioessilvaeu.files.wordpress.com/2020/10/get-dbadiskspace_order-1.png?w=656" alt="" width="656" height="94" class="aligncenter size-large wp-image-2481" />

As we can see on the picture, Data01 and Data02 mount points on both servers had different amounts of free space.

He asked me if <a href="https://dbatools.io">dbatools</a> has any command that could help demystify these differences.

<h4>TL;DR</h4>

No. But dbatools has lots of goodies (commands) and whenever you can't get what you want with just one command, build a script! 
Let's write a script that we can save and reuse later in similar situations.

I will drop here a bunch of checks that we can use to try to demystify this.

<h2>Look for orphan files</h2>

After my colleague asked the question, what came to my mind right away was orphan files.

<h4>What is an orphan file?</h4>

Orphaned database files are files not associated with any attached database on the SQL Server instance.

By running the <code>Find-DbaOrphanfile</code> I discovered that my hunch was wrong.

[code language="PowerShell"]
Find-DbaOrphanFile -SqlInstance REPLICA1
[/code]

<img src="https://claudioessilvaeu.files.wordpress.com/2020/10/find-dbaorphanedfile.png" alt="" width="571" height="102" class="aligncenter size-full wp-image-2479" />

Even so, I was able to get one <code>mdf</code> file as a result.

After a double-check, this <code>mdf</code> file exists on both replicas but the database was not mounted on any instance. We clarified this in a conversation with the client that confirmed to us that this database was detached some months ago so the files could be safely deleted. Conclusion: we have just cleaned <strong>15GB</strong>!

<h2>Check for backups</h2>

On a second hunch, I decided to check if there was any <code>.bak</code> file "lost" on the mount point. There isn't any dbatools command for this, but fear nothing because we can use the Get-ChildItem CmdLet to search and list existing files on directories.

[code language="PowerShell"]
Get-ChildItem -Path \\REPLICA1\D$\Data01 -Filter *.bak -Recurse
[/code]

This command will find all files that have a <code>bak</code> extension on all existing folders, including subfolders. This last part is achieved by using the <code>-Recurse</code> parameter.

<img src="https://claudioessilvaeu.files.wordpress.com/2020/10/check_backupfiles-2.png?w=656" alt="" width="656" height="112" class="aligncenter size-large wp-image-2494" />

And...we found 1. But is this recent? It was some months old, but let's check the content of the backup.

Note: I'm not sure about your experience but sometimes we need/want to do an isolated backup (with COPY_ONLY as an example) and because it's quicker or it is to delete after we copy it, we leverage on the local storage. Even when we have a 3rd party tool for the backups.

<h3>Reading the bak file</h3>

If you are thinking "well maybe we have a dbatools command to read the backup header" you are right!

[code language="PowerShell"]
Read-DbaBackupHeader -SqlInstance REPLICA1 -Path D:\Data01\Backup.bak
[/code]

<img src="https://claudioessilvaeu.files.wordpress.com/2020/10/read-dbabackupheader-1.png?w=656" alt="" width="656" height="152" class="aligncenter size-large wp-image-2495" />

Here are some properties that might help you decide:
– backup date (is it old enough?);
– a COPY_ONLY backup;
– a backup that comes from a different server;
- any other rule that you have to decide if you can delete or just move the file to a different location;
This was how easily we freed another <strong>19,5GB</strong>!

<h2>Check for "stand-alone" databases</h2>

Sometimes, clients don't have all databases within an availability group. I'm not talking about system databases.

Maybe we have a "DBAAdmin" database on each replica. On the other hand, clients may want to have different configurations, created a database for a temporary test or created a new database and haven't yet requested to be added to an availability group.

With the following command, we will be able to find all databases that aren't part of an availability group. 
[code language="PowerShell"]
Get-DbaDatabase -SqlInstance REPLICA1 -ExcludeSystem | Where-Object AvailabilityGroupName -eq '' | Select-Object Name, Size
[/code]
Note: There are different ways to get this info. This is just an example.

In our case, this wasn’t verified, but maybe in your case will be different.

<h2>Compare files on mount points</h2>

As a final check, let's see if we find different files between both replicas.

[code language="PowerShell"]
$replica1Files = Get-ChildItem -Path \\REPLICA1\d$\Data01 -Recurse
$replica2Files = Get-ChildItem -Path \\REPLICA2\d$\Data01 -Recurse
Compare-Object -ReferenceObject $replica1Files -DifferenceObject $replica2Files
[/code]

<img src="https://claudioessilvaeu.files.wordpress.com/2020/10/compare-object_samemp.png?w=656" alt="" width="656" height="128" class="aligncenter size-large wp-image-2498" />

Look what we have found.. 9 database files that exist on just one replica, the <code>REPLICA1</code>. Well, at least on the exact path.

<h3>But we haven't found these databases as orphaned or "stand-alone" database</h3>

Let's pick the list of differences and compare with the 'Data02' mount point.

<h4>First example, using the Compare-Object</h4>

[code language="PowerShell"]
#Saving results to a variable
$differentFileList = Compare-Object -ReferenceObject $replica1Files -DifferenceObject $replica2Files

#Get the files on the second mount point
$replica2FilesOtherMP = Get-ChildItem -Path '\\REPLICA2\d$\Data02\' -Recurse

#Do the comparison but exclude the different ones and include the ones that match
Compare-Object -ReferenceObject $differentFileList.InputObject -DifferenceObject $replica2FilesOtherMP -IncludeEqual -ExcludeDifferent
[/code]

<img src="https://claudioessilvaeu.files.wordpress.com/2020/10/compare-object_differentmp.png?w=656" alt="" width="656" height="84" class="aligncenter size-large wp-image-2499" />

<h4>Another way</h4>

Using Get-ChildItem and filter by the <code>Name</code> that were found as missing
[code language="PowerShell"]
$differentFileList = Compare-Object -ReferenceObject $replica1Files -DifferenceObject $replica2Files
Get-ChildItem -Path \\REPLICA2\d$\Data02 -Recurse | Where-Object Name -in @($differentFileList.InputObject.Name)
[/code]

After all, they exist, but in a different location.

<h2>Wrap up</h2>

I hope this gave you a good overview of ways to find what's happening to your space on your SQL Server Always On Availability Groups replicas.

We have seen that even when we don't have a specific command to achieve a task, we can take advantage of multiple ones and create a script to re-use later.

In this scenario, we have used dbatools commands to search orphaned files, read the header of a backup file and check databases in and outside of availability groups.

Between some trash and misconfiguration, we were able to understand the existing differences regarding free space on the mount points.

Thanks for reading
