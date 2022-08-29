---
author: claudiosilva
comments: true
date: "2019-05-15T00:00:00Z"
tags:
- Automation
- dbatools
- PowerShell
- Scripting
- SMO
- SQLServer
- syndicated
- T-SQL
title: Scripting SQL Server objects with dbatools - Beyond default options
---
Probably you had the need to script out some objects from a SQL Server instance/database and this is quite easy. You just need to right click on the object (well...not on every single one, try it with an Availability Group :-), no script option available) select "Script XXXX as" and you have it.

But have you realized that this option doesn't bring all the stuff?
Let's say you are scripting a table and you have a Non-Clustered index or a trigger...using this option some of the objects under the table will not be scripted out. I understand this as each one of this is a different object, which means if you go to each one you can right click and script just that one.

## SSMS - "Generate Scripts..." option

This is a tedious work and you can easily miss some objects. What can we do on SSMS to make this task easier?

You can accomplish this task by using the "Generate Scripts..." option under "Tasks" when you right-click on the database:
![ssms_generatescripts](/img/2019/05/ssms_generatescripts.png)

This will open the wizard and at the "Set Scripting Options" you can just click on the "Advanced" button and there you can change the properties.
Here you can see that some defaults are in place, and "Script Indexes" is one of them.
![ssms_scriptingoptions](/img/2019/05/ssms_scriptingoptions.png)

This is much easier right? All-in-one in a single scripting operation.

What about automating this task? You want to script out multiple objects from different instances/databases.

## Enter dbatools' "Export-" commands

To search for commands within [dbatools](https://dbatools.io) we can use the [Find-DbaCommand](https://docs.dbatools.io/#Find-DbaCommand).

``` powershell
Find-DbaCommand -Tag Export
```

![find-dbacommand_export](/img/2019/05/find-dbacommand_export.png)

This command give to us a nice `Synopsis` text that help to find which command is the one we want. From the output we can see that we have (as of v0.9.824) 5 commands tagged as Export.

To replicate our SSMS example using PowerShell we will use the `Export-DbaScript`.

Don't forget to use `Get-Help` cmdlet to find the available parameters and get some examples on how you can use the command.

``` powershell
Get-Help Export-DbaScript -Detailed
```

**Tip:** Try other switches like `-Examples` or even `-ShowWindow` (won't work on PSCore but dbatools does!) switches.

### Example using our "MyTable" object

Here is how `MyTable` looks like:
![mytable_treedefinition](/img/2019/05/mytable_treedefinition.png)

* 3 Columns
* 1 Default constraint
* 1 Non-Clustered Index

``` powershell
Get-DbaDbTable -SqlInstance SQL1 -Database DB1 -Table MyTable | Export-DbaScript -Passthru
```

Note: I'm using `-PassThru` parameter to output the script to the console, by default it will create a SQL file.

![export-dbascript_defaultoutput](/img/2019/05/export-dbascript_defaultoutput.png)

The output of this execution is even more incomplete when comparing with SSMS. Here, we dont even get the default constraint scripted.

## Using "New-DbaScriptingOption" command

dbatools has a command that makes it possible to create an object of type `ScriptingOptions`.
Then we can change the properties like we have done before on the "Generate Scripts..." option on SSMS.

``` powershell
$options = New-DbaScriptingOption
$options | Get-Member
```

Use `Get-Member` so you can see what properties the object offers.
![scriptingoptions_get-member](/img/2019/05/scriptingoptions_get-member.png)

Here we start seeing what we need.

By default what are the values of properties like `NonClusteredIndexes` and `DriDefaults`

``` powershell
$options = New-DbaScriptingOption
$options.NonClusteredIndexes
$options.DriDefaults
```

![nci_dridefaults_defaultvalue](/img/2019/05/nci_dridefaults_defaultvalue.png)

`False`! That explains why they are "missing" from our default `Export-DbaScript` output.

NOTE: `Export-DbaUser` comamnd can also leverage on this object. Try it.

Let's change this options to `$true` and pass our `$options` object as the value of the `-ScriptingOptionsObject` parameter and run the command again.

``` powershell
$options = New-DbaScriptingOption
$options.NonClusteredIndexes = $true
$options.DriDefaults = $true
Get-DbaDbTable -SqlInstance SQL1 -Database DB1 -Table MyTable | Export-DbaScript -Passthru -ScriptingOptionsObject $options
```

![export-dbascript_diffoptionsoutput](/img/2019/05/export-dbascript_diffoptionsoutput.png)

Nice! Now we can see all the stuff.

### Try it yourself

See the other options available, change the values, rerun and analyse the output.
Do you need to export it to run on a lower SQL Server version? Change the `TargetServerVersion` option

``` powershell

#Will script the code like SQL Server 2014

$options.TargetServerVersion = "Version120"
```

You want to include the "IF NOT EXISTS" statement? Change the "IncludeIfNotExists" option.

Here is an example to script out a list of tables (add more to the `$TableName` variable):

``` powershell
$SourceServer = "SQL1";
$SourceDB = "DB1";
$TableName = "MyTable", 'YourTable';

$options = New-DbaScriptingOption

$options.DriPrimaryKey = $true
$options.DriForeignKeys = $true
$options.DriNonClustered = $true
$options.DriChecks = $true
$options.DriDefaults = $true
$options.Indexes = $true
$options.IncludeIfNotExists = $true

$TableName | Foreach-Object {
    Get-DbaDbTable -SqlInstance $SourceServer -Database $SourceDB -Table $_ | Export-DbaScript -ScriptingOptionsObject $options -Passthru;
}
```

## Availability Groups example using dbatools

Try it yourself:

``` powershell
Get-DbaAvailabilityGroup -SqlInstance SQL1 -AvailabilityGroup SQL1_AG1 | Export-DbaScript -Passthru
```

## Summary

We have seen how we can leverage on some dbatools commands to generate T-SQL scripts from objects. This way we can versioning or just run them on other instace/database. We have seen what default options it (doesn't) brings and how to add more options to it.
We also saw that, for some objects, the script option is not available. As example Availability Groups, but dbatools can help you here too.

Thanks for reading!
