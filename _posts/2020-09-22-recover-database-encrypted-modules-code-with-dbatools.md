---
layout: post
title: Recover database encrypted modules code with dbatools
date: 2020-09-22 10:30
author: claudiosobralsilva
comments: true
categories: [Automation, dbatools, Decrypt, PowerShell, Scripting, Security, SQLServer, syndicated, WITH ENCRYPTION]
---
This article was initially posted on <a href="https://www.sqlservercentral.com/articles/recover-database-encrypted-modules-code-with-dbatools">SQLServerCentral</a> @ 2020-08-18.
It was interesting some comments I read about it, mainly why people still use `WITH ENCRYPTION` when it's simple to overcome this when we have the right permissions.

SQL Server offers an option to encrypt the code of your modules when using the `WITH ENCRYPTION` syntax.
This allows to hide/obfuscate the modules' code and thus keep away from prying eyes.
It's often used to protect business rules since it allows you to protect some intellectual property.

In this article, we will look at how to recover the code from encrypted modules.

<h2>What is a module in SQL Server?</h2>

In the SQL Server world, a module consists of a block(s) of T-SQL statements that make up a stored procedure, a function, a trigger or a view definition.

<h3>Which modules can be encrypted?</h3>

These are the objects' types that can be encrypted:
. P - Stored procedures
. V - Views
. TR - Triggers
. FN, IF, TF - Functions

On the other hand, the following types also appear in `sys.sql_modules`, but they can't be encrypted:
. RF - Replication-filter-procedure
. R - Rule
. D - Default

You can run the following T-SQL statement to check on <a href="https://docs.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-sql-modules-transact-sql">sys.sql_modules</a> which objects you have and if they are encrypted or not (the `definition` column has the `NULL` value).
``` sql
SELECT sm.object_id, o.name, o.type, sm.definition
  FROM sys.sql_modules sm
	INNER JOIN sys.objects O
	   ON sm.object_id = o.object_id
```

![syssqlmodules](/img/2020/09/sys-sql_modules.png)

<br>

<h3>What happens to the module text when we specify WITH ENCRYPTION?</h3>

From the <a href="https://docs.microsoft.com/en-us/sql/t-sql/statements/create-procedure-transact-sql">CREATE PROCEDURE</a> documentation, `WITH ENCRYPTION`:

<blockquote>...SQL Server converts the original text of the CREATE [enter object type here] statement to an obfuscated format. The output of the obfuscation is not directly visible in any of the catalog views in SQL Server. Users who have no access to system tables or database files cannot retrieve the obfuscated text. However, the text is available to privileged users who can either access system tables over the DAC port or directly access database files. Also, users who can attach a debugger to the server process can retrieve the decrypted procedure from memory at runtime. For more information about accessing system metadata, see Metadata Visibility Configuration.</blockquote>

If you want to understand the <a href="https://sqlperformance.com/2016/05/sql-performance/the-internals-of-with-encryption">Internals of With Encryption</a> make sure you read Paul White’s ([b](https://www.sql.kiwi/) \| [t](https://twitter.com/sql_kiwi)) blog post.

<h2>A Story</h2>

I would like to share a story about encrypted modules.

I inherited a database with encrypted modules but without native scripts. This isn't something that happens too often, however, it can happen and it's not a nice feeling. All of a sudden we inherit a database or a client requests help because they don't have the source code of the modules.

My tool of choice for recovering the code was dbatools.

<h3>Choosing a Tool</h3>

There are multiple ways to retrieve the decrypted version of an encrypted module. We can use a T-SQL script or other third-party tools. Here are a few that you can use:

<ul>
<li><a href="https://gist.github.com/jstangroome/4020443">T-SQL</a></li>
<li><a href="https://www.systoolsgroup.com/sql-decryptor.html">SQLDecryptor</a></li>
<li><a href="https://www.devart.com/dbforge/sql/sqldecryptor/">dbForge SQL Decryptor</a></li>
<li><a href="https://docs.dbatools.io/#Invoke-DbaDbDecryptObject">Invoke-DbaDbDecryptObject command from dbatools PowerShell module</a> </li>
</ul>

The last one will be our focus in this article. Here I will be focusing on how we can do it at scale and with a couple of different use cases.

If you want to understand how dbatools does it, Sander Stad ([b](https://www.sqlstad.nl/) \| [t](https://www.sqlstad.nl/)) was the person that wrote this dbatools' function and he explains it on his blog post <a href="https://www.sqlstad.nl/powershell/decrypting-sql-server-objects-with-dbatools/">Decrypting SQL Server Objects With dbatools</a>.

Here I will be focusing on how we can do it at scale and with a couple of different use cases.

<h2>Prerequisites</h2>

There are a few items you need to follow along with this article.

<h3>dbatools</h3>

You can install the latest version of the module from the PowerShell Gallery by running the following command:
``` powershell
Install-Module -Name dbatools
```

<h3>DAC</h3>

Stands for <a href="https://docs.microsoft.com/en-us/sql/database-engine/configure-windows/diagnostic-connection-for-database-administrators">Dedicated Admin Connection</a>.

<blockquote>The DAC lets an administrator access a running server to execute diagnostic functions or Transact-SQL statements, or to troubleshoot problems on the server, even when the server is locked or running in an abnormal state and not responding to a SQL Server Database Engine connection.</blockquote>

If you want to connect using DAC from a remote server, you need to configure the <a href="https://docs.microsoft.com/en-us/sql/database-engine/configure-windows/remote-admin-connections-server-configuration-option">remote admin connection</a> option as the default is 0 (off).

<h4>Using dbatools to check/set the 'remote admin connection' configuration</h4>

``` powershell
Get-DbaSpConfigure -SqlInstance "instance1" -ConfigName RemoteDacConnectionsEnabled
```

If you want to be able to run this from a remote server, the output should say 1 in the `ConfiguredValue` property.

If the output says 0 (zero), you can use dbatools to change it to 1, by doing:
``` powershell
Set-DbaSpConfigure -SqlInstance "instance1" -ConfigName RemoteDacConnectionsEnabled -Value 1
```

NOTE: In some cases, you may need to restart the instance.

<h2>Examples</h2>

If you're curious about the steps that are simplified by dbatools, you can visit Paul White's <a href="https://sqlperformance.com/2016/05/sql-performance/the-internals-of-with-encryption">post</a> (referenced before) to see how it's done in T-SQL.

I want to say that this is OK if we are talking about a couple of modules. However, that's not the case of our scenario, where we want to decrypt all objects of a specific database and this may be translated into dozens of objects.

Let's see how to use dbatools to eliminate hard and repetitive work.

<h3>A couple of tests</h3>

Before I go through all objects, I decided to start by doing a test by decrypting a single object to check the outcome

<h4>Decrypt a single object on a single database</h4>

The following code will decrypt just a single object and output the result to the console
``` powershell
Invoke-DbaDbDecryptObject -SqlInstance "instance1" -Database "WithEncryption" -ObjectName "MySecretSauce"
```

![decryptsingleobject](/img/2020/09/decryptsingleobject.png)

<h4>We can also decrypt more than one object in the same execution</h4>

Now that I understand what my outcome is, let's try to decrypt two objects from the same database

``` powershell
Invoke-DbaDbDecryptObject -SqlInstance "instance1" -Database "WithEncryption" -ObjectName "MySecretSauce", "MySecret"
```

![decrypttwoobjects](/img/2020/09/decryptsingleobjects.png)


NOTE: If you want to decrypt all encrypted objects that belong to a specific database you just need to omit the `-ObjectName` parameter.
``` powershell
Invoke-DbaDbDecryptObject -SqlInstance "instance1" -Database "WithEncryption"
```

<h2>What if I want to save the results to file?!</h2>

Back to my story, I knew that I would like to save a decrypted version of each object. This way we can edit the code and update the module or just to keep a readable copy of it (don't forget to keep it on your versioning tool).

Ultimately, I have decided to do the following:
1. Save a decrypted version of each object as a T-SQL script.
2. Compile SQL scripts but without encryption on a different/same database

<h3>Saving results to a local folder</h3>

To do so, with dbatools, we just need to define the `-ExportDestination` parameter and indicate to which folder we want to output our decrypted T-SQL code. This command will create a folder for each type of objects, and within and you will find one SQL script per object that was decrypted.
``` powershell
Invoke-DbaDbDecryptObject -SqlInstance "instance1" -Database "WithEncryption" -ExportDestination "d:\temp\"
```

![outout](/img/2020/09/outout.png)

<h3>Compile SQL scripts but without encryption on a different/same database</h3>

If you open any of these decrypted files, you will see that the `WITH ENCRYPTION` keywords are there, which means that it will encrypt the code if you run it.

![decrypttwoobjects](/img/2020/09/afterdecrypt.png)

If you want to replace all encrypted (Stored Procedures, for example) version by the decrypted version, you will need to:
1. drop encrypted Stored Procedures objects
2. Comment/remove the `WITH ENCRYPTION`
3. Compile them on the database

To check which stored procedures are encrypted, you can use the `Get-DbaDbStoredProcedure`
``` powershell
$instance = "instance1"
$database = "myDB"
$SPs = Get-DbaDbStoredProcedure -SqlInstance $instance -Database $database -ExcludeSystemSp | Where-Object IsEncrypted -eq $true
$SPs | Select-Object InstanceName, Database, Schema, Name
# The next line is a comment on purpose to avoid accidents :-). However, it is an option that you can use to DROP the stored procedures
# $SPs | Foreach-object {$_.Drop()}
```

Here is a script to run the steps two and three:
``` powershell
$instance = "instance1"
$database = "myDB"
$modulesFolder = "D:\temp\$instance\$database\StoredProcedure"
$objectsList = (Get-ChildItem -Path $modulesFolder -Recurse -Filter "*.sql*") | Select-Object -ExpandProperty FullName
foreach ($object in $objectsList) {
    $TSQLcode = (Get-Content -Path $object -Raw) -replace '\bWITH ENCRYPTION\b', ''
    Invoke-DbaQuery -SqlInstance $instance -Database $database -Query $TSQLcode
}
```

Here we can see that the Stored Procedure is no longer encrypted

![outoutnoencrypted](/img/2020/09/outout_noencrypted.png)

<h2>Wrapping up</h2>

We have seen how we can leverage dbatools PowerShell module to do the hard work for us when it comes to decrypting modules.
This can be useful to recover lost code, make backups even for versioning it.
Hopefully, it is nothing that you will need to use every single day! But, if that day arrives you will be prepared with another tool to make your life easier!

Thanks for reading!
