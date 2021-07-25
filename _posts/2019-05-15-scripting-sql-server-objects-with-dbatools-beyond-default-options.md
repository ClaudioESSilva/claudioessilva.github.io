---
layout: post
title: Scripting SQL Server objects with dbatools - Beyond default options
date: 2019-05-15 13:20
author: claudiosilva
comments: true
tags: [Automation, dbatools, PowerShell, Scripting, SMO, SQLServer, syndicated, T-SQL]
---
Probably you had the need to script out some objects from a SQL Server instance/database and this is quite easy. You just need to right click on the object (well...not on every single one, try it with an Availability Group :-), no script option available) select "Script XXXX as" and you have it.

But have you realized that this option doesn't bring all the stuff?
Let's say you are scripting a table and you have a Non-Clustered index or a trigger...using this option some of the objects under the table will not be scripted out. I understand this as each one of this is a different object, which means if you go to each one you can right click and script just that one.

<h2>SSMS - "Generate Scripts..." option</h2>

This is a tedious work and you can easily miss some objects. What can we do on SSMS to make this task easier?

You can accomplish this task by using the "Generate Scripts..." option under "Tasks" when you right-click on the database:
<img src="https://claudioessilva.github.io/img/2019/05/ssms_generatescripts.png" alt="" width="599" height="448" class="aligncenter size-full wp-image-1692" />

This will open the wizard and at the "Set Scripting Options" you can just click on the "Advanced" button and there you can change the properties.
Here you can see that some defaults are in place, and "Script Indexes" is one of them.
<img src="https://claudioessilva.github.io/img/2019/05/ssms_scriptingoptions.png" alt="" width="718" height="727" class="aligncenter size-full wp-image-1693" />

This is much easier right? All-in-one in a single scripting operation.

What about automating this task? You want to script out multiple objects from different instances/databases.

<h2>Enter dbatools' "Export-" commands</h2>

To search for commands within <a href="https://dbatools.io">dbatools</a> we can use the <a href="https://docs.dbatools.io/#Find-DbaCommand">Find-DbaCommand</a>.

``` powershell
Find-DbaCommand -Tag Export
```

<img src="https://claudioessilva.github.io/img/2019/05/find-dbacommand_export.png" alt="" width="800" height="96" class="aligncenter size-full wp-image-1694" />

This command give to us a nice `Synopsis` text that help to find which command is the one we want. From the output we can see that we have (as of v0.9.824) 5 commands tagged as Export.

To replicate our SSMS example using PowerShell we will use the `Export-DbaScript`.

Don't forget to use `Get-Help` cmdlet to find the available parameters and get some examples on how you can use the command.
``` powershell
Get-Help Export-DbaScript -Detailed
```

<strong>Tip:</strong> Try other switches like `-Examples` or even `-ShowWindow` (won't work on PSCore but dbatools does!) switches.

<h3>Example using our "MyTable" object</h3>

Here is how `MyTable` looks like:
<img src="https://claudioessilva.github.io/img/2019/05/mytable_treedefinition.png" alt="" width="291" height="236" class="aligncenter size-full wp-image-1695" />

<ul>
<li>3 Columns</li>
<li>1 Default constraint</li>
<li>1 Non-Clustered Index</li>
</ul>

``` powershell
Get-DbaDbTable -SqlInstance SQL1 -Database DB1 -Table MyTable | Export-DbaScript -Passthru
```

Note: I'm using `-PassThru` parameter to output the script to the console, by default it will create a SQL file.

<img src="https://claudioessilva.github.io/img/2019/05/export-dbascript_defaultoutput.png" alt="" width="800" height="133" class="aligncenter size-full wp-image-1696" />

The output of this execution is even more incomplete when comparing with SSMS. Here, we dont even get the default constraint scripted.

<h2>Using "New-DbaScriptingOption" command</h2>

dbatools has a command that makes it possible to create an object of type `ScriptingOptions`.
Then we can change the properties like we have done before on the "Generate Scripts..." option on SSMS.

``` powershell
$options = New-DbaScriptingOption
$options | Get-Member
```

Use `Get-Member` so you can see what properties the object offers.
<img src="https://claudioessilva.github.io/img/2019/05/scriptingoptions_get-member.png" alt="" width="727" height="771" class="aligncenter size-full wp-image-1697" />

Here we start seeing what we need.

By default what are the values of properties like `NonClusteredIndexes` and `DriDefaults`
``` powershell
$options = New-DbaScriptingOption
$options.NonClusteredIndexes
$options.DriDefaults
```

<img src="https://claudioessilva.github.io/img/2019/05/nci_dridefaults_defaultvalue.png" alt="" width="261" height="53" class="aligncenter size-full wp-image-1698" />

`False`! That explains why they are "missing" from our default `Export-DbaScript` output.

NOTE: `Export-DbaUser` comamnd can also leverage on this object. Try it.

Let's change this options to `$true` and pass our `$options` object as the value of the `-ScriptingOptionsObject` parameter and run the command again.

``` powershell
$options = New-DbaScriptingOption
$options.NonClusteredIndexes = $true
$options.DriDefaults = $true
Get-DbaDbTable -SqlInstance SQL1 -Database DB1 -Table MyTable | Export-DbaScript -Passthru -ScriptingOptionsObject $options
```

<img src="https://claudioessilva.github.io/img/2019/05/export-dbascript_diffoptionsoutput.png" alt="" width="800" height="252" class="aligncenter size-full wp-image-1699" />

Nice! Now we can see all the stuff.

<h3>Try it yourself</h3>

See the other options available, change the values, rerun and analyse the output.
Do you need to export it to run on a lower SQL Server version? Change the `TargetServerVersion` option

``` powershell
#Will script the code like SQL Server 2014
$options.TargetServerVersion = ";Version120";
```

You want to include the "IF NOT EXISTS" statement? Change the "IncludeIfNotExists" option.

Here is an example to script out a list of tables (add more to the `$TableName` variable):
``` powershell
$SourceServer = ";SQL1";;
$SourceDB = ";DB1";;
$TableName = ";MyTable";, 'YourTable';

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

<h2>Availability Groups example using dbatools</h2>

Try it yourself:

``` powershell
Get-DbaAvailabilityGroup -SqlInstance SQL1 -AvailabilityGroup SQL1_AG1 | Export-DbaScript -Passthru
```

<h2>Summary</h2>

We have seen how we can leverage on some dbatools commands to generate T-SQL scripts from objects. This way we can versioning or just run them on other instace/database. We have seen what default options it (doesn't) brings and how to add more options to it.
We also saw that, for some objects, the script option is not available. As example Availability Groups, but dbatools can help you here too.

Thanks for reading!
