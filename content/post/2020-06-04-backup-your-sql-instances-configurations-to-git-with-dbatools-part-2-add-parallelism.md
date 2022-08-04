---
author: claudiosilva
comments: true
date: "2020-06-04T00:00:00Z"
tags:
- Automation
- backup
- dbatools
- disaster recovery
- Export
- git
- parallelism
- PoshRSJob
- PowerShell
- Scripting
- SQLServer
- syndicated
title: Backup your SQL instances configurations to GIT with dbatools - Part 2 - Add
  parallelism
---
We have seen how we can export and save the results to a folder and commit them to a GIT repository on my last blog post <a href="https://claudioessilva.eu/2020/06/02/backup-your-sql-instances-configurations-to-git-with-dbatools-part-1/">Backup your SQL instances configurations to GIT with dbatools – Part 1</a>.
At the end of that post, I have mentioned that I would write about how we can lower down the execution times of our script by leveraging on parallelism.

<h2>Going parallel</h2>

When we need to manage dozens of servers/instances, even with automated scripts sometimes we would like that our script finishes faster.
There are multiple reasons that a sequential (one-by-one) run takes longer.
Few examples I have hit in the past:

<ul>
<li>Instance not available - We need to wait for the timeout.</li>
<li>A slower connection to one or multiple instances - Even if the average execution per instance is 10 seconds, if we pick slower/more data ones that take 30 seconds, it's OK for 1, but might end up in multiple minutes wasted.</li>
<li>Specific sub-command takes longer (number of objects, different domain, network segment, etc). Even if this instance (or set of instances) are the final ones on the list the total execution time can go from minutes to hours.</li>
</ul>

Let me pick on this last example. `Export-DbaInstance` runs multiple `Export-Dba*` commands under the hood. This means that different queries are being run and therefore it can be faster/slower depending on the number of objects. I have a real example on this one where one instance takes more than 1 hour to generate the `logins.sql` file, however, it's a 100kb file which means a lot of logins/databases/permissions.

Bottom line is that your mileage may vary, but if you have thousands, hundreds or even just dozens of instances to connect, going parallel may help you by decreasing the total time needed to accomplish the task.

<h3>Options</h3>

There are a couple of options, like the native PowerShell cmdlets `Start-Job`/`Stop-Job` a.k.a background jobs, Runspaces jobs and Thread jobs but I will just mention two of them. One is a nice addition to the most recent version of PowerShell (v7) and the other using a PowerShell module.

In case you don't know, with PowerShell v7 it's possible to use a new option `-Parallel` with `ForEach-Object`. Check PowerShell's team blog post <a href="https://devblogs.microsoft.com/powershell/powershell-foreach-object-parallel-feature/">PowerShell ForEach-Object Parallel Feature</a>.

However, because I don't have (yet :-)) PS7, I will keep leveraging on [PoshRSJob](https://github.com/proxb/PoshRSJob) module, which uses runspaces, created by Boe Prox ([T](https://twitter.com/proxb) \| [B](https://learn-powershell.net/)).
If this module is unknown to you, as a quick summary, it:

<blockquote>Provides an alternative to PSjobs with greater performance and less overhead to run commands in the background, freeing up the console and allowing throttling on the jobs.</blockquote>

I have been using it for a long time and I'm very happy with the results.

Just install from the PowerShell gallery with
``` powershell
Install-Module -Name PoshRSJob
```
or download from the Github repository.

<h3>What does it look like?</h3>

To give a small and easy but effective example let's use PowerShell cmdlet `Test-Connection`.

Sequential execution:
``` powershell
$serverList = 'instance1', 'instance2', 'instance3', 'instance4', 'instance5', 'instance6', 'instance7', 'instance8', 'instance9', 'instance10'
$serverList | ForEach-Object { Test-Connection -ComputerName $_}
```

Took about ~32 seconds.

Using PoshRsJob to execute:
``` powershell
$serverList = 'instance1', 'instance2', 'instance3', 'instance4', 'instance5', 'instance6', 'instance7', 'instance8', 'instance9', 'instance10'
$serverList | Start-RSJob -ScriptBlock {Test-Connection -ComputerName $_} | Wait-RSJob | Receive-RSJob
# To clean-up
Get-RsJob | Remove-RsJob
```

This execution took about ~6 seconds. This translates in a 7 times faster execution!

Just to explain the code:

<ul>
<li>The script block of the `Start-RSJob` is picking the values from the pipeline and using them directly. </li>
<li>Then, we pipe the results to the `Wait-RSJob` which will wait for all runspaces to be finished.</li>
<li>Finally, we request the results using the `Receive-RSJob` command.</li>
</ul>

<h3>What kind of sorcery is that?</h3>

There is an explanation

<h4>Enter -Throttle parameter</h4>

On the small description that I have shared about the PoshRsJob it says:

<blockquote>allowing throttling on the jobs</blockquote>

Although we haven't specified this parameter, the parallelism kicked anyway. That happened because a value of 5 is being used by default.

<h2>Fine-tuning the -Throttle parameter</h2>

There are multiple factors to keep in mind when selecting a value for `-Throttle`.

It will depend on your available CPU (number of cores)/memory on the server where you are running the script.

But, It also depends on the type of script that you are running.

<h3>Confused?</h3>

If you have a script that will try to find one file on one disk recursively, we may think that parallelism can be helpful to make it faster, however, the disk is the same and therefore we can hit an I/O bottleneck.
On the other hand, if we are trying to find the file on different disks we can parallelize and have one runspace running on each disk avoiding the I/O bottleneck and getting better results.

Another example is the one mentioned on the "When should it be avoided?" section of the earlier mentioned <a href="https://devblogs.microsoft.com/powershell/powershell-foreach-object-parallel-feature/">PowerShell v7 - Parallel blog post</a>, if your script is trivial adding the parallelism can actually make it much slower!

<h3>Test and adjust</h3>

That said, I have scripts where I use 10 but others where I use 15.

You need to test. Start with the default of 5, then increase this number and document the total execution time. Try to find your tipping-point and keep that number. Revisit them to adjust whenever needed.

Let's have an idea on how much time it takes when leveraging on `-Throttle 10`:
Using PoshRsJob to execute:
``` powershell
$serverList = 'instance1', 'instance2', 'instance3', 'instance4', 'instance5', 'instance6', 'instance7', 'instance8', 'instance9', 'instance10'
$serverList | Start-RSJob -ScriptBlock {Test-Connection -ComputerName $_} -Throttle 10 | Wait-RSJob | Receive-RSJob
# To clean-up
Get-RsJob | Remove-RsJob
```

Took about ~3 seconds.

Cool stuff!

<h2>Adding dbatools to the party</h2>

Now that you have an idea on how it works we can start using our dbatools' commands.

<h3>Be aware that...</h3>

The PoshRsJob uses [runspaces](https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.runspaces). Trying to simplify the explanation, think about each runspace as a PowerShell session on its own.

This means when we run a command using the `Start-RSjob` we have 5 (by default) sessions running, each one of these sessions will need to import dbatools module.

Note: There is a `-ModulesToImport` parameter however, in my previous tests this hasn't made any big difference.

<h3>Let's add one dbatools' command, Test-DbaConnection.</h3>

Sequential execution:
``` powershell
$serverList = 'instance1', 'instance2', 'instance3', 'instance4', 'instance5'
$serverList | Test-DbaConnection
```

Execution with PoshRsJob:
``` powershell
$serverList = 'instance1', 'instance2', 'instance3', 'instance4', 'instance5'
$serverList | Start-RSJob -ScriptBlock {Test-DbaConnection $_} | Wait-RSJob | Receive-RSJob
# To clean-up
Get-RsJob | Remove-RSJob
```

I have also run for 10 and 20 instances. Here are the results:
<table>
<thead>
<tr>
  <th>Test-DbaConnection</th>
  <th align="center">Execution Time (5 instances)</th>
  <th align="center">Execution Time (10 instances)</th>
  <th>Execution Time (20 instances)</th>
</tr>
</thead>
<tbody>
<tr>
  <td>Sequential Execution</td>
  <td align="center">00:02:15</td>
  <td align="center">00:03:50</td>
  <td>00:06:45</td>
</tr>
<tr>
  <td>Start-RSJob</td>
  <td align="center">00:01:21</td>
  <td align="center">00:01:53</td>
  <td>00:02:51</td>
</tr>
</tbody>
</table>

Note: I have used cold cache (started a new session).
Note2: On my test server the module load takes ~23 seconds

<h2>Back to Export-DbaInstance</h2>

In the final script you will see that I have created a variable `$sb` which stands for 'script block' this way, the code is more readable.
Also, I'm passing to parameters using `-ArgumentList` parameter which accepts an array of values. This means that inside the script block the:

<ul>
<li>`$tempPath` will be `$ppath`</li>
<li>`$excludedObjects` will be `$pexcludeObjects`</li>
<li>Each server on the `$serverList` variable will be the `$_`</li>
</ul>

<h3>Final script with parallelism</h3>

Copy and save the script within your repository folder and change the following variables:

<ul>
<li>Line 2, 3 and 4.</li>
<li>Line 7: Number of simultaneous runspaces to be used by `Start-RsJob`</li>
<li>Line 10: If your column is not named as ConnString (what are the odds?) you also need to change the end of this line.</li>
<li>Line 31: Use Get-Help Export-DbaInstance -Parameter Exclude and decide what you want to exclude if any.</li>
</ul>

The main block change appears between line 36 and 54.

``` powershell
# Where we will get the list of servers
$centralServer = "centralServer"
$centralDatabase = "centralDatabase"
$query = "SELECT ConnString FROM <table>"

# number of parallel executions using PoshRsJob module
$throttle = 5

# Get the list of servers
$ServerList = Invoke-DbaQuery -SqlInstance $centralServer -Database $centralDatabase -Query $query | Select-Object -ExpandProperty ConnString

$instancesPath = "$PSScriptRoot\Instances"
$tempPath = "$instancesPath\temp"

# Change location to be able to run GIT commands on the local repository
Set-Location -Path $PSScriptRoot

# get folder up-to-date
git pull

# Create/clear temp folder
if (Test-Path -Path $tempPath) {
    # Clean the folder
    Get-ChildItem $tempPath | Remove-Item -Force -Recurse -Confirm:$false
} else {
    $null = New-Item -Path $tempPath -ItemType Directory
}

<#
    Databases -> Exclude databases will not script the RESTORE statements for last backup. We don't need this because we use a 3rd party tool and this was slowing down the execution
    PolicyManagement and ReplicationSettings -> We don't use
    Credentials and LinkedServers -> We script as a second step to hide passwords (because -ExcludePassword will also hide hashed ones from logins, and this we want to keep)
#>
$excludeObjects = "Databases", "PolicyManagement", "ReplicationSettings", "Credentials", "LinkedServers"

$sb = {
    param (
        $ppath
        ,$pexcludeObjects
    )
    # Run the export and get a collection of files generated
    $outputDirectory = Export-DbaInstance -SqlInstance $_ -Path $ppath -Exclude $pexcludeObjects -NoPrefix

    # Extract the directory full path of the export to use next
    $instanceOutDir = $outputDirectory.Directory | Select-Object -ExpandProperty FullName -Unique

    # Export credentials and LinkedServers but excluding the password. Output to same folder
    Export-DbaCredential -SqlInstance $_ -FilePath "$instanceOutDir\Credentials.sql" -ExcludePassword
    Export-DbaLinkedServer -SqlInstance $_ -FilePath "$instanceOutDir\LinkedServers.sql" -ExcludePassword
}
$ServerList | Start-RSJob -ScriptBlock $sb -Throttle $throttle -ArgumentList $tempPath, $excludeObjects

# Wait for the parallel job finish and remove them
Get-RSJob | Wait-RSJob | Remove-RSJob

# Find .sql files where the name starts with a number and rename files to exclude numeric part "#-<NAME>.sql" (remove the "#-")
Get-ChildItem -Path $tempPath -Recurse -Filter "*.sql" | Where {$_.Name -match '^[0-9]+.*'} | Foreach-Object {Rename-Item -Path $_.FullName -NewName $($_ -split '-')[1] -Force}

# Remove the suffix "-datetime"
Get-ChildItem -Path $tempPath | Foreach-Object {Rename-Item -Path $_.FullName -NewName $_.Name.Substring(0, $_.Name.LastIndexOf('-')) -Force}

# Copy the folders/files from the temp directory to one level up (overwrite)
Copy-Item -Path "$tempPath\*" -Destination $instancesPath -Recurse -Force

# Clean-up temp folder
Get-ChildItem $tempPath | Remove-Item -Force -Recurse -Confirm:$false

# Add/commit/push the changes
git add .
git commit -m "Export-DbaInstance @ $((Get-Date).ToString("yyyyMMdd-HHmmss"))"
git push
```

<h3>Results</h3>

Just to give an idea of the differences, for the exact same 5 instances running the script from part 1 or running this one leads to this execution times
<table>
<thead>
<tr>
  <th>Our script with GIT and Export-DbaInstance</th>
  <th align="center">Execution Time (5 instances)</th>
</tr>
</thead>
<tbody>
<tr>
  <td>Sequential execution</td>
  <td align="center">00:12:51</td>
</tr>
<tr>
  <td>Start-RSJob</td>
  <td align="center">00:06:28</td>
</tr>
</tbody>
</table>

Pretty cool right? :-)

<h2>Summary</h2>

I have shared the PoshRsJob module which makes it possible to run code in parallel. On my tests, we can see almost 50% cut-off on the execution times, and this was just for 5 instances.

Again, I hope this gives you, at least, a good starting point to decrease the total execution times for your processes.
Test with different commands and leverage on the beauty of the parallelism!

<h2>Curious about PS7 -Parallel and PoshRsJob performance differences?</h2>

If you are curious about a comparison between both approaches, you can read the blog post [T](https://twitter.com/WindosNZ) \| [B](https://toastit.dev/)) does a comparison between this new feature and the PoshRSJob module.

Also, Nasir Zubair ([T](https://twitter.com/nsr81) \| [B](https://randombrainworks.com/)) back in 2018 wrote about all of them (excluding -Parallel which was not a thing at the time) on the <a href="https://randombrainworks.com/2018/01/29/powershell-background-jobs-runspace-jobs-thread-jobs">PowerShell - Background jobs, runspace jobs, thread jobs</a> blog post.

Thanks for reading!
