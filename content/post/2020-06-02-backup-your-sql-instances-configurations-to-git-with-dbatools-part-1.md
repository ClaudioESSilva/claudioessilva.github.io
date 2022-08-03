---
author: claudiosilva
comments: true
date: "2020-06-02T00:00:00Z"
tags:
- Automation
- backup
- dbatools
- disaster recovery
- Export
- git
- PowerShell
- Scripting
- SQLServer
- syndicated
title: Backup your SQL instances configurations to GIT with dbatools - Part 1
---
Today I want to share how I'm keeping a copy of instances' configurations using <a href="https://dbatools.io">dbatools</a>.

Chrissy LeMaire (<a href="https://blog.netnerds.net/">B</a> \| <a href="https://twitter.com/cl">T</a>) wrote about it before on the <a href="https://dbatools.io/dr/">Simplifying disaster recovery with dbatools</a> blog post.
In this post, I will add one step and save the output on a GIT repository.

<h2>Pre-requirements</h2>

<ul>
<li>You need a GIT repository</li>
<li>GIT tools installed on the server where you are running the script so you can commit your changes</li>
<li>dbatools</li>
<li>A list or a place to get all instances that you want to run the export </li>
</ul>

<h2>Preparation</h2>

<h3>Git repository</h3>

Clone your repository to a location where dbatools can write to.

NOTE: To fully automate this process, I recommend making use of an access token (<a href="https://help.github.com/pt/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line">github</a> \| <a href="https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html">gitlab</a> documentation as examples) instead of user/password as we don't want to be asked for the password when committing the changes.

<h3>The list of instances from where we will export the configurations</h3>

I'm using a central database with a table that contains my list of servers.
I'm using the dbatools' command `Invoke-DbaQuery` to get that list.
``` powershell
# Where we will get the list of servers
$centralServer = "centralServer"
$centralDatabase = "centralDatabase"
$query = "SELECT ConnString FROM <table/view>"

# Get the list of servers
$ServerList = Invoke-DbaQuery -SqlInstance $centralServer -Database $centralDatabase -Query $query | Select-Object -ExpandProperty ConnString
```


<h2>Running dbatools' Export-DbaInstance command</h2>

A quick walk-through in case you have never used this command before.

<h3>Execution</h3>

If you have never used this command, you can test for a single instance by running the following:
``` powershell
Export-DbaInstance -SqlInstance "devInstance" -Path "D:\temp"
```

This will create all scripts in the `D:\temp` folder. A folder named "devInstance-{date}" will be created.
In this folder, you will find 1 file per 'object type'. The file names are in the form of "#-.sql" where the # is a number that represents the iterator on the order that the internal calls of the underlying functions happen.

<h4>Heads up</h4>

This means that if we call it with no exclusions but then we call it again but with `-Exclude SpConfigure` the scripts names will be different.
For the first case, we will have a `1-sp_configure.sql` but for the second the number 1 will appear as `1-customerrors.sql`. This isn't a problem when exporting on demand and/or occasionally, but if we want to leverage on GIT to track the differences this can be confusing.
Let's keep this in mind and I will explain later how to avoid this.

<h3>"This also exports credentials, linked servers and Logins, right? What about the passwords?"</h3>

Good point! We can export objects that deal with passwords. Do you want to save them in clear text?
Maybe, maybe not. It's up to you. Here I will share a version where clear-text passwords are excluded from the exported scripts regarding credentials and linked servers, but I will keep the hashed password for the logins.

<h4>How does that works?</h4>

Introducing the `-ExcludePassword` parameter, as mentioned on the documentation (don't forget to use and abuse `Get-Help`):

<blockquote>If this switch is used, the scripts will not include passwords for Credentials, LinkedServers or Logins.</blockquote>

Just add `-ExcludePassword` like this:
``` powershell
Export-DbaInstance -SqlInstance "devInstance" -Path "D:\temp" -ExcludePassword
```

If you run with this switch and if open the scripts, you will see that for:
- Logins: No hashed password is present
- Credentials &amp; LinkedServers will have their clear text passwords replaced by 'EnterStrongPasswordHere' and '#####' respectively.

<h2>GIT commands I'm using</h2>

Here are the 4 git commands that I'm using:
 - `git pull` -> To make sure I have the most recent version of the repository on my local folder
 - `git add .` -> Will stage all changes for the next commit
 - `git commit -m"some message"` -> Will do the commit of the changes with a specific message
 - `git push` -> Will push the changes to the central repository

The first one is run before triggering the `Export-DbaInstance` and the rest only after all the other steps finish.

<h2>A couple of notes before showing the full script</h2>

1 - When running the command, I use a `temp` folder for the `-Path` parameter (you will understand why in a second). I have added this folder to my `.gitignore` the file inside `Instances` folder so it won't be synchronized.

2 - Do you remember the "Heads up" I have done earlier in the post about the outputted files' names? Let's nail that one.
GIT is great to keep track of the changes that happened on a file. However, for that to happen, we need to make sure that the file name is the same. Because of the example I have mentioned before, my workaround goes by some renaming convention.

<h3>Files' names</h3>

After the export command finish and before committing the changes to our GIT repository I run the following command:
``` powershell
# Find .sql files where name starts with an number and rename files to exclude numeric part "#-<NAME>.sql" (remove the "#-")
Get-ChildItem -Path $tempPath -Recurse -Filter "*.sql" | Where {$_.Name -match '^[0-9]+.*'} | Foreach-Object {Rename-Item -Path $_.FullName -NewName $($_ -split '-')[1] -Force}
```

The `$tempPath` represents my main folder where all the exported folders will be created and within these folders, we will have our scripts (hence the `-Recurse` parameter).
1 - We are getting (`Get-ChildItem`) on all folders and sub-folders (`-Recurse`) all files with extension `.sql` (`-Filter`).
2 - We filter the results to only get files whose names start with one or more digits (`$_.Name -match '^[0-9]+.*'`)
3 - `Foreach-Object` file we have found we rename it by splitting the file name by the '-' char and using the second part of the result of the split `[1]` (`[0]` will contain the number)

<h3>Folders' names</h3>

Using the same logic, we remove the suffix "-date" from the folder's name.
``` powershell
# Remove the suffix "-datetime"
Get-ChildItem -Path $tempPath | Foreach-Object {Rename-Item -Path $_.FullName -NewName $_.Name.Substring(0, $_.Name.LastIndexOf('-')) -Force}
```
In this case, I have decided to use the `Substring` method along with the `LastIndexOf('-')` because the '-' char is a valid character to use as an instance name.

NOTE: We can use the `-split` method anyway but we will need then to join all the occurrences excluding the last one. This way you see two different ways to accomplish the same result.
``` powershell
#Example with '-split' and '-join'
$folderName = "SQL-SERVER-01-20200602"
$split = $folderName -split '-'
$split[0..($split.Count-2)] -join '-'
```

<h3>Move folder with the files from the temp folder to the final folder</h3>

The final PowerShell steps before we commit the changes are, after renaming the folder and its files, move them and overwrite on the repository folder and clean-up our `temp` folder
``` powershell
# Copy the folders/files from the temp directory to one level up (overwrite)
Copy-Item -Path "$tempPath\*" -Destination $instancesPath -Recurse -Force

# Clean-up temp folder
Get-ChildItem $tempPath | Remove-Item -Force -Recurse -Confirm:$false
```

Because my temp folder exists as a sub-folder of my repository my `-Destination` parameter is getting the parent folder to replace the existing files.

<h2>The full script</h2>

Here is the full script.

Copy, save the script within your repository folder and change the following variables:
Line 2, 3 and 4.
Line 7: If your column is not named as `ConnString` (what are the odds?) you also need to change the end of this line.
Line 31: Use `Get-Help Export-DbaInstance -Parameter Exclude` and decide what you want to exclude if any.

``` powershell
# Where we will get the list of servers
$centralServer = "centralServer"
$centralDatabase = "centralDatabase"
$query = "SELECT ConnString FROM <table>"

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

foreach($server in $ServerList) {
    # Run the export and get a collection of files generated
    $outputDirectory = Export-DbaInstance -SqlInstance $server -Path $tempPath -Exclude $excludeObjects -NoPrefix

    # Extract the directory full path of the export to use next
    $instanceOutDir = $outputDirectory.Directory | Select-Object -ExpandProperty FullName -Unique

    # Export credentials and LinkedServers but excluding the password. Output to same folder
    Export-DbaCredential -SqlInstance $server -FilePath "$instanceOutDir\Credentials.sql" -ExcludePassword
    Export-DbaLinkedServer -SqlInstance $server -FilePath "$instanceOutDir\LinkedServers.sql" -ExcludePassword
}


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


<h3>Example of the output for one of the instances</h3>

<img src="https://claudioessilva.github.io/img/2020/05/exportdbainstance_togit_folderout.png" alt="" width="447" height="360" class="aligncenter size-full wp-image-2092" />

<h2>Summary</h2>

We have seen how to leverage `Export-DbaInstance` dbatools' command to export instance's configuration as backup and/or for disaster recovery purposes.
On top of that, I have shown how you can format the results so you can add it to GIT and track the changes.

I hope this gives you, at least, a good starting point to implement backups over the time of your instances configurations.
Adjust for your needs, test, and keep it running.

In the second and final part of this process (<a href="https://claudioessilva.eu/2020/06/04/backup-your-sql-instances-configurations-to-git-with-dbatools-part-2-add-parallelism/">Backup your SQL instances configurations to GIT with dbatools – Part 2 – Add parallelism</a>), we will implement parallelism to lower down our execution times.
Stay tuned.

Thanks for reading!
