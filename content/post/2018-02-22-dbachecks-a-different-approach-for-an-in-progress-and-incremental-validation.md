---
author: claudiosilva
comments: true
date: "2018-02-22T00:00:00Z"
tags:
- dbachecks
- dbatools
- Pester
- Power BI
- PowerBI
- PowerShell
- SQLServer
- syndicated
title: dbachecks - A different approach for an in-progress and incremental validation
---
<a href="https://dbachecks.io/" rel="noopener" target="_blank">dbachecks</a> is a new PowerShell module from the SQL Server Community! For more information, read <a href="https://dbatools.io/introducing-dbachecks/" rel="noopener" target="_blank">introducing dbachecks</a>.

If you don't know dbachecks, we have released a good amount of blog posts that will help you:
[Announcing dbachecks – Configurable PowerShell Validation For Your SQL Instances by Rob Sewell](https://sqldbawithabeard.com/2018/02/22/announcing-dbachecks-configurable-powershell-validation-for-your-sql-instances/)
[introducing dbachecks - a new module from the dbatools team! by Chrissy LeMaire](https://dbachecks.io/introducing)
[install dbachecks by Chrissy LeMaire](https://dbachecks.io/install)
[dbachecks commands by Chrissy LeMaire](https://dbachecks.io/commands)
[dbachecks – Using Power BI dashboards to analyse results by Cláudio Silva](http://claudioessilva.eu/2018/02/22/dbachecks-using-power-bi-dashboards-to-analyse-results/)
[My wrapper for dbachecks by Tony Wilhelm](https://v-roddba.blogspot.com/2018/02/wrapper-for-dbachecks.html)
[Checking backups with dbachecks by Jess Promfret](http://jesspomfret.com/checking-backups-with-dbachecks/)
[dbachecks please! by Garry Bargsley](http://blog.garrybargsley.com/dbachecks-please)
[dbachecks – Configuration Deep Dive by Rob Sewell](https://sqldbawithabeard.com/2018/02/22/dbachecks-configuration-deep-dive/)
[Test Log Shipping with dbachecks](https://www.sqlstad.nl/powershell/test-log-shipping-with-dbachecks/)
[Checking your backup strategy with dbachecks by Joshua Corrick](https://corrick.io/blog/checking-your-backup-strategy-with-dbachecks)
[Enterprise-level reporting with dbachecks by Jason Squires](http://www.sqlnotnull.com/2018/02/20/enterprise-level-reporting-with-dbachecks-from-the-makers-of-dbatools)
[Adding your own checks to dbachecks by Shane O'Neill](http://nocolumnname.blog/2018/02/22/adding-your-own-checks-to-dbachecks)
[dbachecks - A different approach for an in-progress and incremental validation by Cláudio Silva](https://claudioessilva.eu/2018/02/22/dbachecks-a-different-approach-for-an-in-progress-and-incremental-validation/)

Other documentation:
[dbachecks readme](https://github.com/sqlcollaborative/dbachecks)
[dbachecks wiki (for developers)](https://github.com/sqlcollaborative/dbachecks/wiki)

I will share one of the ways I like to use dbachecks when I'm knocking down the problems in order to increase the green percentage and lower the red one!

### Output files

How do you save the results?
Do you save one file per instance (all tests included)?
Using `-Append`?
Alternatively, one per check/environment?

There is not a single way of doing this. Neither a "correct way".
Here you can find another different way grouping your results per application.

I will share the way I like to use it, when using the PowerBI dashboards to analyze the results, and explain the advantages I get from it.

### Choosing a road

My personal choice is to have one file per check and environment. This means that if I'm running a check for `SuspectPage` I run for all instances/databases belonging to the development environment, I will end with a file named `dbachecks_1_SuspectPage_DEV.json`.
Keeping the same line, I will get a filename `dbachecks_1_SuspectPage_PRD.json` if I run it for production.

``` powershell
$sqlInstances = "dev1", "dev2"

$checks = (Get-DbcCheck).UniqueTag
$checks.ForEach{

Invoke-DbcCheck -SqlInstance $sqlInstances -Checks $_ -PassThru -Show Fails | Update-DbcPowerBiDataSource -Environment "DEV" -Path "C:\windows\temp\dbachecks"

}
```

This will output:

<a href="https://claudioessilva.github.io/img/2018/02/quickerrefresh_11.png"><img class="aligncenter size-full wp-image-1280" src="https://claudioessilva.github.io/img/2018/02/quickerrefresh_11.png" alt="" width="503" height="323"></a>

## Total number of files

"This will create a lot of files..."

### Let's do some math

Let's imagine for a moment that we have to manage 3 different environments (DEV, QA, PRD):
Currently, we have 80 checks if your approach is 1 file per environment you will end up with 3 files. The way I like to do it, I will end up with 240 files.

WOW! Big difference right?

### Fear nothing

Yes, it is a big difference but that is no problem at all! The Power BI file will deal with this increase flawlessly as I have mentioned before on [dbachecks – Using Power BI dashboards to analyse results](http://claudioessilva.eu/2018/02/22/dbachecks-using-power-bi-dashboards-to-analyse-results/) blog post.

## Advantages

The biggest advantage, for me, is the possibility I have to re-run a single test for a single environment and with it, only touch just one of the files. It's an update of that file.
By doing it, for the same destination folder, I will overwrite the existing file then I literally just need to go and hit "Refresh" button on PowerBI dashboards.
This way it took just the time of that test and not all of them. Quick and easily, I'm able to confirm that the fix I have run actually worked and my red values are lower! :D

## Real scenario

<ol>
<li>You run, overnight, all your tests.</li>
<li>In the morning you open the Power BI dashboard and hit "Refresh"</li>
<li>You look to your red values.</li>
<li>You pick one (for this examples purpose let's say "Auto-Close")</li>
<li>You run a query to fix all databases with the wrong value</li>
<li>Re-run just this test just for one environment (run multiple times for various environment)</li>
<li>Go to your Power BI and hit "Refresh" again.</li>
<li>Repeat from point 3.</li>
</ol>

The point 6 is where you will save huge amounts of time because if you have just one file for all tests for one environment, you would need to rerun ALL the tests in order to refresh your environment.

Hope this helps!

Thanks for reading!
