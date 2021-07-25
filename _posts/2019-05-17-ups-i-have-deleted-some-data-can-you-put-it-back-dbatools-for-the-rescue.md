---
layout: post
title: "Ups...I have deleted some data. Can you put it back?" - dbatools for the rescue
date: 2019-05-17 09:15
author: claudiosilva
comments: true
tags: [Copy Data, dbatools, PowerShell, Scripting, SMO, SQLServer, syndicated, T-SQL]
---
Few days ago I received a request to restore a dozen of tables because someone have deleted more data than it was supposed.
I immediately thought about <a href="https://dbatools.io">dbatools</a> for the job!

NOTE: I also thought about SSMS "Import/Export Data". And this is ok when someone says "it's to run just once, just now". When you are in the IT for a while you know that is not only once :-). And what if I need to re-run? Or save it as example and share with my colleagues? Doing this using a PowerShell script makes it much more flexible.

At this post, I'm assuming that we already have restored what will be our source database using the backup requested by the client.

<h2>Let's start - Finding the right command</h2>

I knew we have a `Copy` command for table data.

To search for commands within <a href="https://dbatools.io">dbatools</a> we can use the <a href="https://docs.dbatools.io/#Find-DbaCommand">Find-DbaCommand</a>.

``` powershell
Find-DbaCommand -Pattern Copy*Table*Data
```

<img class="aligncenter size-full wp-image-1677" src="https://claudioessilva.github.io/img/2019/05/find-dbacommand.png" alt="" width="640" height="97">

Note: As you can see, we can use wildcards to do the search when using `-Pattern` parameter.

From the results list, we know that we have at least three commands (as of v0.9.824) that match the specified pattern. By reading the `Synopsis` of the first command that seems what we need to accomplish the work.

<h3>Get familiarized with the command</h3>

Don't forget to use `Get-Help` cmdlet to find the available parameters and get some examples on how you can use the command.
``` powershell
Get-Help Copy-DbaDbTableData -Detailed
```

<img class="aligncenter size-full wp-image-1679" src="https://claudioessilva.github.io/img/2019/05/get-help_detailed.png" alt="" width="800" height="578">

<h2>Let's try the command and copy the data</h2>

``` powershell
$params = @{
    SqlInstance = 'sql1'
    Destination = 'sql2'
    Database = 'db1'
    DestinationDatabase = 'db2'
    Table = '[dbo].[Table]'
    DestinationTable = '[dbo].[Table]'
}
Copy-DbaDbTableData @params
```

<h3>Result</h3>

`WARNING: [14:26:06][Copy-DbaDbTableData] Table [dbo].[Table] cannot be found in db2. Use -AutoCreateTable to automatically create the table on the destination.`

Wait a moment...it yielded a warning?

Oh, I see...this will not work if the table does not exists on the destination database.

At this point I realised that some of the requested tables were dropped. The client did not specify that.

But dbatools got you covered and the warning gives you one hint: use `-AutoCreateTable` which will, per its description,

<blockquote>Creates the destination table if it does not already exist, based off of the "Export..." script of the source table.</blockquote>

That is nice!

I added the `-AutoCreateTable` parameter and rerun the command
``` powershell
$params = @{
    SqlInstance         = 'sql1'
    Destination         = 'sql2'
    Database            = 'db1'
    DestinationDatabase = 'db2'
    Table               = '[dbo].[Table]'
    DestinationTable    = '[dbo].[Table]'
    AutoCreateTable     = $true
}
Copy-DbaDbTableData @params
```

And now it has completed successfully.

<h2>At this point you may be thinking..."everything is done!"</h2>

The client just said that he wants to replace all the data from last backup for a dozen of tables. In this case some of the tables do not exist anymore, they were dropped.. so adding the `-AutoCreateTable` parameter helped.

And we are done! Aren't we?

<h3>Not so fast!</h3>

If the table don't have any indexes, triggers, etc, or you just want the table skeleton, yes the work here is done!
Otherwise, we are not finished yet. And this was the scenario.

Primary key was missing and some constraints and indexes as well.

<h2>Beyond default scripting options</h2>

As I have demonstrated on my last post <a href="https://claudioessilva.eu/2019/05/15/scripting-sql-server-objects-with-dbatools-beyond-default-options/">Scripting SQL Server objects with dbatools – Beyond default options</a>, we can generate an object of `ScriptingOptions` and use the `-ScriptingOptionsObject` parameter available on the `Export-DbaScript` command to specify more than the defaults.

<h3>Exploring other options</h3>

As stated on the previous post, we have some properties like:

<ul>
<li>Indexes</li>
<li>DriPrimaryKey</li>
<li>DriForeignKeys</li>
<li>etc</li>
</ul>

By default they are set to `$false` and that explains why our `-AutoCreateTable` parameter (which uses default options) didn't bring all of this details from our source tables.

This means that with a little bit more code we will be able to accomplish our requirements.

<h3>The code</h3>

Note: This is an modified version (to meet my needs) of the original script that I have borrowed from Andy Levy's (<a href="https://flxsql.com">b</a> \| <a href="https://twitter.com/ALevyInROC">t</a>) blog post <a href="https://flxsql.com/copying-individual-tables-with-dbatools/">Copying Individual Tables with dbatools</a>. Andy is also a dbatools contributor.

``` powershell
$SourceServer = ";SQL1";;
$DestinationServer = ";SQL2";
$SourceDB = ";srcDB";;
$DestinationDB = ";dstDB";;
$tables = ";Table1";, 'Table2', ";Table3";;

$options = New-DbaScriptingOption

$options.DriPrimaryKey = $true
$options.DriForeignKeys = $true
$options.DriUniqueKeys = $true
$options.DriClustered = $true
$options.DriNonClustered = $true
$options.DriChecks = $true
$options.DriDefaults = $true

$tables | ForEach-Object {
    # Get the table definition from the source
    [string]$tableScript = Get-DbaDbTable -SqlInstance $SourceServer -Database $SourceDB -Table $_ | Export-DbaScript -ScriptingOptionsObject $options -Passthru;

    if (-not [string]::IsNullOrEmpty($tableScript)) {
        if ($null -eq (Get-DbaDbTable -SqlInstance $DestinationServer -Database $DestinationDB -Table $_)) {
        # Run the script to create the table in the destination
        Invoke-DbaQuery -Query $tableScript -SqlInstance $DestinationServer -Database $DestinationDB;
        }
        else {
            Write-Warning ";Table $_ already exists in detination database. Will continue and copy the data.";
        }

        # Copy the data
        Copy-DbaDbTableData -SqlInstance $SourceServer -Database $SourceDB -Destination $DestinationServer -DestinationDatabase $DestinationDB -KeepIdentity -Truncate -Table $_ -DestinationTable $_;
    }
    else {
        Write-Warning ";Table $_ does not exists in source database.";
    }
}
```

This will do the following steps:

<ul>
<li>`New-DbaScriptingOption` creates a new object of Scripting Options type and then we set a bunch of properties as `$true`.</li>
</ul>

For each of the tables that we define on our `$tables` list variable:

<ul>
<li>`Export-DbaScript` will generate the T-SQL script from the source table using the properties that we have defined. In this case, Keys (Primary, Foreign, Unique), Defaults and Checks Constraints and also clustered and non-clustered indexes.</p></li>
<li><p>`Invoke-DbaQuery` will run the generated script on the destination database. At this point we have the same table structure on both sides. This will only run if the table does not exists on the destination database.</p></li>
<li><p>Finally we use our `Copy-DbaDbTableData` command to copy the records. Here I have choosen to truncate the table with `-Truncate` parameter and keep identity values by specifying the `-KeepIdentity`.</p></li>
</ul>

<h3>Special callout:</h3>

<p>If these tables have relations between them, you need to specify the table list in a specific order to make sure that parent tables are created before child tables. Otherwise you will get, as expected, some errors.

<h2>Final thoughts</h2>

dbatools has, literally, hundreds of commands so it's important to know how to find the right one for the job.
Make sure you take a look on the help to understand what is or not covered by the process. As we saw in this example, assuming that the table would be created is a pitfall. For that, we need to use another parameter, but even so when reading the parameter description we will understand that this table will not be created with its full definition. This means that primary key, constraints, indexes, etc will not be created by default.

Because we are using PowerShell, and there is more than one way to accomplish a task, combining both commands as the `New-DbaScriptingOption` will make it more flexible and possible to reach the final result that we need.

Thanks for reading!
