---
author: claudiosilva
comments: true
date: "2020-07-31T00:00:00Z"
tags:
- Automation
- dbatools
- Export
- Permissions
- PowerShell
- roles
- Scripting
- Security
- SQLServer
- syndicated
title: Generate SQL Server Role Member Reports using dbatools and ImportExcel PowerShell
  modules
---
<em>This was initial posted on <a href="https://www.sqlservercentral.com/articles/generate-role-member-reports-using-dbatools-and-the-importexcel-powershell-modules">SQL Server Central articles</a>.</em>

As one of dbatools' first members, I've been using it for years and it's really my goto tool. This task was no different!

Today's tip and trick using <a href="https://dbatools.io">dbatools</a> is about generating an Excel workbook that contains lists of SQL Server roles and its members.

<h2>The Usefulness of these Reports</h2>

These reports are especially useful when performing tech-refreshes (migrating from an old version to a newer one) and you want to do some housekeeping. For example, finding logins that should be part of a role and they are not. Once you know there are problems, you decided to do a double-check on the whole list.

Excel makes these reports even better because they can be used to sort/filter large amounts of data: instances, roles and logins. Excel also makes the any data manipulation it easier when editing, marking members to be deleted, or highlighting issues when working with other teams.

<h2>Doing it manually?</h2>

I would like you to think about how much time you would need to:

<ul>
<li>Get a list of all roles at the server and database level</li>
<li>Get a list of all members in these roles from all databases </li>
<li>Copy results to an Excel file</li>
<li>Format the data as a table, add filters, freeze rows, put some colors, etc.</li>
</ul>

I would say more time than you would like. Doing this manually needs way too many clicks and keystrokes for something that we can be using daily.

<h2>Back on track, what will we get?</h2>

The output will be an Excel (xlsx) file that will have multiple spreadsheets. In my case those are:

<ul>
<li>`Logins` - List of all logins and some useful properties like `CreateDate`, `LastLogin`, `HasAccess`, `IsLocked`, `IsDisabled`</li>
<li>`InstanceLevel` roles &amp; members - Here we can find which logins have, for instance, `sysadmin` rights on the instance.</li>
<li>`DatabaseLevel` roles &amp; members - Allow us to know for example who belongs to the `db_owner` role for a specific database</li>
</ul>

<h2>What does the output look like?</h2>

Here is a sneak-peak of the result that you will see right after opening the file.

<img src="https://claudioessilva.github.io/img/2020/06/featureimage.png" alt="" width="656" height="263" class="aligncenter size-large wp-image-2257" />

The formatted table with headers, filters and top freeze-row will be there too!

<h2>Prerequisites</h2>

To accomplish this we will write a PowerShell script and for that, we will using commands from two PowerShell modules.

<a href="https://dbatools.io">dbatools</a>

<blockquote>dbatools is an open-source cross-platform PowerShell toolkit for SQL Server DBAs. With over 150 contributors from the SQL and PowerShell communities, dbatools is designed and written by the people who use it in their everyday work. dbatools includes solutions for everyday tasks like performing backups and restores, migrations, and setting up Availability Groups. dbatools is designed to enable SQL DBAs to reliably and repeatedly automate the usual daily tasks.</blockquote>

And on top of this, you should know that it counts with more than 500 commands.

The other module is <a href="https://github.com/dfinke/ImportExcel">ImportExcel</a>, created by Doug Finke (<a href="https://twitter.com/dfinke">T</a> \| <a href="https://dfinke.github.io/">B</a>)

<blockquote>ImportExcel allows you to read and write Excel files without installing Microsoft Excel on your system.</blockquote>

"<em>...without installing Microsoft Excel...</em>" - How cool is that?!

<h3>How to install the modules</h3>

You can run the following command and both modules will be downloaded to your machine.

``` powershell
Install-Module -Name dbatools, ImportExcel
```

If you don't have admin privileges on the machine you can use `-Scope CurrentUser` to get the modules installed under your profile.

``` powershell
Install-Module -Name dbatools, ImportExcel -Scope CurrentUser
```

<h2>dbatools' commands to use</h2>

You can use <a href="https://docs.dbatools.io">docs.dbatools.io</a> to search for a command. Or, if you are in an offline environment, you can use the `Find-DbaCommand`.

For instance, because we are talking about logins, I would run the following command to search for dbatools commands that have the `-Tag Login`

``` powershell
Find-DbaCommand -Tag Login
```

<img class="aligncenter size-large wp-image-2203" src="https://claudioessilva.github.io/img/2020/06/find-dbacommand__tag_login.png?w=656" alt="" width="656" height="246" />

The dbatools' team has tagged all these (+20) commands as to be related with logins.

Taking a closer look, we can see some `Get-` commands and from those, we will use:

<ul>
<li>`Get-DbaLogin` - To get all logins on the instance</li>
<li>`Get-DbaDbRoleMember` - To get all database roles and its members</li>
<li>`Get-DbaServerRoleMember` - To get all server roles and its members</li>
</ul>

<h3>Get-DbaLogin</h3>

Getting the list of all logins on the instance is as easy as:

``` powershell
Get-DbaLogin -SqlInstance "instance1"
```

Since we may want to share this list with the client, I suggest to filter out some logins that will not be useful, or perhaps worse, these logins will confuse the client. I'm talking about your 'renamedSA' account, all the Windows users starting with ‘NT *', or other logins that belong to you or your team and the client does not need to be aware of them.

<h3>Filtering</h3>

With the Get-DbaLogin command, we have two types of filters. One way is to filter by an exact login name (for example "renamedSA"). For that, we need to use the `-ExcludeLogin` parameter. The other way is using the `-ExcludeFilter`. This one is very handy, as it accepts wildcards patterns. This means that we can filter out all the logins that start with “NT ” by passing the value "NT *". You can add multiple patterns by splitting the list with a comma. `-ExcludeFilter "NT *", "##*"`

Using these parameters, I can run this command:

``` powershell
Get-DbaLogin -SqlInstance "instance1" -ExcludeLogin "renamedSA" -ExcludeFilter "NT *", "##*"
```

<h3>Get-DbaServerRoleMember</h3>

This cmdlet will get the list of all members for all server roles:

``` powershell
Get-DbaServerRoleMember -SqlInstance "instance1"
```

We want to keep this consistent with the previous command. If we filtered out logins before, we will have to filter them here as well. In this case, this command has a `-Login` parameter where we can specify a list of logins that we want to process.

We can leverage from the previous `Get-DbaLogin` command output to get the login's names and pass them to the `-Login` parameter as `$logins.Name`

``` powershell
# Get all logins to analyse
$logins = Get-DbaLogin -SqlInstance "instance1" -ExcludeLogin "renamedSA" -ExcludeFilter "NT *", "##*"

# Get just for the logins we want
Get-DbaServerRoleMember -SqlInstance "instance1" -Login $logins.Name
```

We can also use the `-ExcludeDatabase` parameter to filter out some databases we don't want to get the data from.

``` powershell
# Get all logins to analyse
$logins = Get-DbaLogin -SqlInstance "instance1" -ExcludeLogin "renamedSA" -ExcludeFilter "NT *", "##*"

# Get just for the logins we want
Get-DbaServerRoleMember -SqlInstance "instance1" -ExcludeDatabase "myDB" -Login $logins.Name
```

<h3>Get-DbaDbRoleMember</h3>

This will get us a list of all members for all databases and all their roles:

``` powershell
Get-DbaDbRoleMember -SqlInstance "instance1"
```

Here we can, again, leverage from the previous `Get-DbaLogin` command output to get the login's names and use them to filter the ones we want. But in this case, we don't have any input parameter to pass this list. This means that, we will need to pass the values through the pipeline and filter using the `Where-Object` cmdlet.

``` powershell
# Get all logins to analyse
$logins = Get-DbaLogin -SqlInstance "instance1" -ExcludeLogin "renamedSA" -ExcludeFilter "NT *", "##*"

# Get just for the logins we want
Get-DbaDbRoleMember -SqlInstance "instance1" | Where-Object UserName -in $logins.Name
```

This command also has the `-ExcludeDatabase` parameter available.

``` powershell
# Get all logins to analyse
$logins = Get-DbaLogin -SqlInstance "instance1" -ExcludeLogin "renamedSA" -ExcludeFilter "NT *", "##*"

# Get just for the logins we want
Get-DbaDbRoleMember -SqlInstance "instance1" -ExcludeDatabase "myDB" | Where-Object UserName -in $logins.Name
```

These are the three dbatools’ commands that we will be using to get our data. Let’s see what we need from the 'ImportExcel' module.

<h2>ImportExcel command</h2>

With the results, all there’s left to do is to output them to a nice Excel spreadsheet. For that, we just need to pipe our results to the `Export-Excel` command.

You should explore all the available parameter on this command, however, I will share the ones we will use on this script:

<ul>
<li>`Path` - Filepath with filename and .xlsx extension</li>
<li>`WorkSheetname` - As we want to output the results of different dbatools' commands to different spreadsheets, we use this parameter to name them. Note: If there is no spreadsheet with a defined name, a new one will be created.</li>
<li>`TableName` - This will convert the data in the worksheet into a table with a name</li>
<li>`TableStyle` - Selects the style for the named table. Example: default will be using shades of blue in an interspersed way.</li>
<li>`AutoSize` - Sizes the width of the Excel column to the maximum width needed to display all the containing data in that cell.</li>
<li>`FreezeTopRow` - Freezes headers in the top row. Useful if your table has many rows, as you can keep track of which column you are looking at.</li>
</ul>

This means that we can call the `Export-Excel` command in the following way:

``` powershell
# Get all logins to analyse
$logins = Get-DbaLogin -SqlInstance "instance1" -ExcludeLogin "renamedSA" -ExcludeFilter "NT *", "##*"

# Get just for the logins we want
$dbRoleMembers = Get-DbaDbRoleMember -SqlInstance "instance1" | Where-Object UserName -in $logins.Name

# Splatting the parameters
$excelDBRoleMembersOutput = @{
    Path = "D:\Export.xlsx"
    WorkSheetname = "DatabaseLevel"
    TableName = "DatabaseLevel"
    FreezeTopRow = $true
    TableStyle = "Medium6"
    AutoSize      = $true
}
# I have added the `-Show` switch parameter which will open the file after its' generation
$dbRoleMembers | Export-Excel @excelDBRoleMembersOutput -Show
```

<h2>Parameterize the script</h2>

As I know that I will be using this heavily, I decided to create some variables to be set at the top of the script and use them in the commands. This way, I have just to change the instance name and run the command. You can also pick this code and wrap around a function and include the `param()` block so you can call it from the command line.

You can find all the parameters I use between lines 1 and 10.

<h3>Putting all together - The full script</h3>

``` powershell
$SQLInstance = "instance1"
$excludeDatabase = "myDB", "myDB2"
$excludeLogin = "renamedSA"
$excludeLoginFilter = "NT *", "##*"

# To be used on Export-Excel command
$excelFilepath = "D:\$SQLInstance_$((Get-Date).ToFileTime()).xlsx"
$freezeTopRow = $true
$tableStyle = "Medium6"
$autoSize = $true

#Region Get data
# Get all instance logins
$Logins = Get-DbaLogin -SqlInstance $SQLInstance -ExcludeLogin $excludeLogin -ExcludeFilter $excludeLoginFilter

# Get all server roles and its members
$instanceRoleMembers = Get-DbaServerRoleMember -SqlInstance $SQLInstance -Login $Logins.Name

# Get all database roles and its members
$dbRoleMembers = Get-DbaDbRoleMember -SqlInstance $SQLInstance -ExcludeDatabase $excludeDatabase | Where-Object UserName -in $logins.Name
#EndRegion

# Remove the report file if exists
Remove-Item -Path $excelFilepath -Force -ErrorAction SilentlyContinue

#Region Export Data to Excel
# Export data to Excel
## Export Logins
$excelLoginSplatting = @{
    Path = $excelFilepath
    WorkSheetname = "Logins"
    TableName = "Logins"
    FreezeTopRow = $freezeTopRow
    TableStyle = $tableStyle
    AutoSize = $true
}
$Logins | Select-Object "ComputerName", "InstanceName", "SqlInstance", "Name", "LoginType", "CreateDate", "LastLogin", "HasAccess", "IsLocked", "IsDisabled" | Export-Excel @excelLoginSplatting

## Export instance roles and its members
$excelinstanceRoleMembersOutput = @{
    Path = $excelFilepath
    WorkSheetname = "InstanceLevel"
    TableName = "InstanceLevel"
    TableStyle = $tableStyle
    FreezeTopRow = $freezeTopRow
    AutoSize = $autoSize
}
$instanceRoleMembers | Export-Excel @excelinstanceRoleMembersOutput

## Export database roles and its members
$exceldbRoleMembersOutput = @{
    Path = $excelFilepath
    WorkSheetname = "DatabaseLevel"
    TableName = "DatabaseLevel"
    TableStyle = $tableStyle
    FreezeTopRow = $freezeTopRow
    AutoSize = $autoSize
}
$dbRoleMembers | Export-Excel @exceldbRoleMembersOutput
#EndRegion
```

<h2>FAQ</h2>

<h3>What if I want to get different properties?</h3>

In the script, you can change the output list by changing the properties used on the `Select-Object` cmdlet (line 37).

<h3>How can I make the Excel file open automatically after exporting all data?</h3>

As shown on the "ImportExcel command" section, you can add the `-Show` parameter on the last `Export-Excel` command (line 62).

<h2>What's next?</h2>

Want a slight change? Use the same technique but with different commands?
Hopefully, this article gave you some ideas. Now it's a question of changing the commands that get data for the ones you want and apply the same recipe to output to an Excel file.

<h2>Wrap up</h2>

In this article we could see how easy and fast an Excel file with multiple spreadsheets can be generate, each with a table with filters, colors, etc and..we don't even need to have Microsoft Excel installed on the machine where we are running commands!

Thanks for reading!
