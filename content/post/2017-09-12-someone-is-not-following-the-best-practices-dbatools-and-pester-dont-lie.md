---
author: claudiosilva
comments: true
date: "2017-09-12T00:00:00Z"
tags:
- BestPractices
- dbatools
- Pester
- PowerShell
- SQLServer
- syndicated
- Tests
- Unit Test
- TSQL2sDay
title: "Someone is not following the best practices - dbatools and Pester don't lie!"
---

[![(TSQL2sDay)](/img/2017/09/tsql2sday.jpg)](https://sqldbawithabeard.com/2017/09/05/tsql2sday-94-lets-get-all-posh/)

This month’s T-SQL Tuesday is brought to us by my good friend Rob Sewell ([b](https://twitter.com/sqldbawithbeard) | [t](https://sqldbawithabeard.com)). Together “Let’s get all Posh – What are you going to automate today?”

I have written some blog posts on how I use PowerShell to automate mundane tasks or some other more complex scenarios like:  [Find and fix SQL Server databases with empty owner property using dbatools PowerShell module](http://redglue.org/find-and-fix-sql-server-databases-with-empty-owner-property-using-dbatools-powershell-module/) or [Have you backed up your SQL Logins today?](http://redglue.org/have-you-backed-up-your-sql-logins-today/)  or even using ReportingServicesTools module for deploy reports - [SSRS Report Deployment Made Easy – 700 times Faster](http://redglue.org/ssrs-report-deployment-made-easy-700-times-faster/).

But today I want to bring something little different.  This year, back in May I saw two presentations from Rob about using Pester to do unit tests for our PowerShell code and also to validate options/infrastructure like checklists. This got my attention and made me want to play with it!

Therefore, I want to share an example with you using two of my favorite PowerShell modules dbatools and Pester.

## Let's play a game

You go to a client or you have just started working on your new employer and you want to know if the entire SQL Server state complies with the best practices.

For the propose of this blog, we will check:

* if our databases (from all instances) have the following configurations:
  * PageVerify -> Checksum
  * AutoShrink -> False

* if each SQL Server instance:
  * has the MaxMemory setting configured to a value lower than the total existing memory on the host.

How would you do that?

### Let me introduce to you - dbatools

For those who don’t know, [dbatools is a PowerShell module](https://github.com/sqlcollaborative/dbatools/), written by the community, that makes SQL Server administration much easier using PowerShell. Today, the module has more than 260 commands. Go get it ([dbatools.io](http://dbatools.io)) and try it! If you have any doubt you can join the team on the #dbatools channel at the [Slack – SQL Server Community](https://dbatools.io/slack).

In this post I will show some of those commands and how they can help us.

Disclaimer: Obviously this **is not the only way</strong> to accomplish this request, but for me, is <strong>one excellent way!**

### Get-DbaDatabase command

One existing command on the dbatools swiss army knife is [Get-DbaDatabase](https://dbatools.io/functions/get-dbadatabase/).
As it states on the command description
> The Get-DbaDatabase command gets SQL database information for each database that is present in the target instance(s) of SQL Server. If the name of the database is provided, the command will return only the specific database information.
This means that I can run the following piece of PowerShell code and get some information about my databases:

``` powershell
Get-DbaDatabase -SqlServer sql2016 | Format-Table
```

This returns the following information from all existing databases on this SQL2016 instance.

![get-dbadatabase_sql2016_ft](/img/2017/09/get-dbadatabase_sql2016_ft.png?w=656)

#### Too little information

That's true, when we look to it, it brings not enough information. I can't even get the "PageVerify" and "AutoShrink" properties that I want. But that is because we, by default, only output a bunch of properties and this doesn't mean that the others are not there.

To confirm this we can run the same code without the " | Format-Table" that is useful to output the information in a table format but depending on the size of your window it can show more or less columns.
By running the command without the "format-table" we can see the following (just showing the first 3 databases):

![get-dbadatabase_sql2016_without_ft2](/img/2017/09/get-dbadatabase_sql2016_without_ft2.png)

Now, we can see more properties available look to the ones inside the red rectangle.

#### I continue not to see the ones I want

You are right. But as I said before that does not means they aren't there.
To simplify the code let's assign our output to a variable named `$databases` and then we will have a look to all the Members existing on this object

``` powershell
$databases = Get-DbaDatabase -SqlServer sql2016
$databases | Get-Member
```

Now we get a lot of stuff! The [Get-Member cmdlet](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-member?view=powershell-5.1) say to us which Properties and Methods of the object (in this case the `$databases`).

This means that I can use a filter to find results with "auto" in its name:

``` powershell
$databases | Get-Member | Where-Object Name -like *auto*
```

Some cmdlets have parameters that allow us to filter information without the need to pipeing it so<ins>,</ins> the last line command could be written as:

``` powershell
$databases | Get-Member -Name *auto*
```

Which will output something like this:

![databases_gm_whereauto](/img/2017/09/databases_gm_whereauto.png?w=656)

So, we have found our "AutoShrink" property. With this in mind, lets query all the properties we want.

``` powershell
$databases | Select-Object SqlInstance, Name, AutoShrink, PageVerify
```

And here we have the result:

![databases_data](/img/2017/09/databases_data.png?w=656)

### Scaling for multiple instances

This is where the fun begins.
We can pass multiple instance names and the command will go through all of them and output a single object with the data.

``` powershell
$databases = Get-DbaDatabase -SqlServer sql2016, sql2012
$databases | Select-Object SqlInstance, Name, AutoShrink, PageVerify
```

Which outputs:

![get-dbadatabase_sql2016_sql20121](/img/2017/09/get-dbadatabase_sql2016_sql20121.png?w=656)

As you can see I have passed two different instances sql2016 (in red) and sql2012 (in green) and the output brought both information.

### Using Out-GridView to filter results

We can use another PowerShell native cmdlet called [Out-GridView](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/out-gridview?view=powershell-5.1) to show our results in a grid format. This grid also make it possible to use filters.
For the next example, I have misconfigurated two databases so we can find them among the others.

``` powershell
$databases | Select-Object SqlInstance, Name, AutoShrink, PageVerify | Out-GridView
```

![databases_data_ogv](/img/2017/09/databases_data_ogv.png?w=656)

As you can see, inside red rectangles we have two not optimal configurations regarding the SQL Server best practices. You can also see the green rectangle on the top left corner where you can type text and the results will be filter as you type. So if you type "true" you will end just with one record.

![databases_data_ogv_filter](/img/2017/09/databases_data_ogv_filter.png?w=656)

### Checking the MaxMemory configuration

Now, that you have seen how to do it for one command, you can start exploring the other ones. As I said in the beginning of this post we will also check the MaxMemory setting for each instance. We will use the [Get-DbaMaxMemory](https://dbatools.io/functions/get-dbamaxmemory/). From the help page we can see the description that says:
> This command retrieves the SQL Server ‘Max Server Memory’ configuration setting as well as the total physical installed on the server.
Let's run it through our two instances:

``` powershell
Get-DbaMaxMemory -SqlInstance sql2012, sql2016
```

![get-dbamaxmemory_2instances](/img/2017/09/get-dbamaxmemory_2instances.png)

We can see that SQL2012 instance is running on a host with 6144MB of total memory but its MaxMemory setting is set to 3072MB and also, SQL2016 instance has 4608MB configured form the 18423MB existing on the host.

## Final thought on this fast introduction to dbatools PowerShell module

As you see, it is pretty easy to run the commands for one or multiple instances to get information to work on. Also you have seen different ways to output that information.
I encourage you to use the [Find-DbaCommand](https://dbatools.io/functions/find-dbacommand/) to discover what other commands exists and what they can do for you.

Example, if you want to know which commands we have that works with "memory" you can run the following code:

``` powershell
Find-DbaCommand -Pattern memory
```

![find-dbacommand](/img/2017/09/find-dbacommand.png?w=656)

## Automating even more

Using the dbatools module we could verify if the best practice is in place or not. But we had to run the command and then verify the values by filtering and looking for each row.

You may be thinking that must exists some other more automated method to accomplish that, right?

### Say hello to Pester PowerShell module

[Pester](https://github.com/pester/Pester) is unit test framework for PowerShell. I like to say *If you can PowerShell it, you can Pester it*.
> Pester provides a framework for running Unit Tests to execute and validate PowerShell commands. Pester follows a file naming convention for naming tests to be discovered by pester at test time and a simple set of functions that expose a Testing DSL for isolating, running, evaluating and reporting the results of PowerShell commands.
Please see [how to install Pester module here](https://github.com/pester/Pester/wiki/Installation-and-Update).

With this framework, that I really encourage you to read more about it on the [project Wiki](https://github.com/pester/Pester/wiki/Pester), we can automate our tests and make it do the validations for us!

As quick example - if we run the following code:

We are checking if the login returned by the `whoami` is base\claudio.

![pester_whoami_ok](/img/2017/09/pester_whoami_ok.png)

This return green which means it's ok!

If is not ok (because I'm testing to "base\claudio.silva"), will retrieve something like this:

![pester_whoami_nok](/img/2017/09/pester_whoami_nok.png?w=656)

### Quick walkthrough on Pester syntax

As you can see, to do a test we need a:

* <a href="https://github.com/pester/Pester/wiki/Describe" target="_blank">Describe block</a> (attention: the "{" must be on the same line!)
* Inside it, the <a href="https://github.com/pester/Pester/wiki/Context" target="_blank">Context block</a>
* And inside the Context block the validation that we want to do the <a href="https://github.com/pester/Pester/wiki/It" target="_blank">It</a> and <a href="https://github.com/pester/Pester/wiki/Should" target="_blank">Should</a>. 

### Let's join forces

With this in mind, I can create tests for my needs using dbatools and Pester.

I will have a variable (`$SQLServers`)

``` powershell
$SQLServers = @('sql2012', 'sql2014', 'sql2016')
```

with all the instances I want to test and two "Describe" blocks, one for "Testing database options" - PageVerify and AutoShrink

``` powershell
Describe "Testing Database Options for $Server" {
   foreach($Server in $SQLServers){
      #Just selecting some columns so it don't take too much time returning all the thing that we don't want
      $databases = Get-DbaDatabase -SqlServer $server | Select-Object Name, SqlInstance, CompatibilityLevel, PageVerify, AutoShrink, AutoClose
      foreach($database in $databases) {
         Context "$($Database.Name) Validation" {
            It "PageVerfiy set to Checksum" {
               $database.PageVerify| Should Be "Checksum"
            }
            It "AutoShrink set to False" {
               $database.AutoShrink| Should Be $false
            }
         }
      }
   }
}
```

And another one for "Testing instance MaxMemory":

``` powershell
Describe "Testing Instance MaxMemory"{
   foreach($Server in $SQLServers){
      $instanceMemory = Get-DbaMaxMemory -SqlInstance $Server
      Context "Checking MaxMemory value" {
         It "$($Server) instance MaxMemory value $($instanceMemory.SqlMaxMb) is less than host total memory $($instanceMemory.TotalMB)" {
            $instanceMemory.SqlMaxMb | Should BeLessThan $instanceMemory.TotalMB
         }
      }
   }
}
```

To run this tests we should save a file with the ".Tests.ps1" ending name. Let's save as "SQLServerBestPractices.Tests.ps1". To run the tests we need to use the Invoke-Pester and the file that contains the tests.

``` powershell
Invoke-Pester .\SQLServerBestPractices.Tests.ps1
```

![pester_tests_with_fails](/img/2017/09/pester_tests_with_fails.png?w=656)

### To much noise - can't find the failed tests easily

You are right, showing all the greens make us lose the possible red ones. But Pester has an option to show just the failed tests.

``` powershell
Invoke-Pester .\SQLServerBestPractices.Tests.ps1 -Show Failed
```

![pester_tests_with_show_failed_only](/img/2017/09/pester_tests_with_show_failed_only.png?w=656)

But, be aware that `-Show Fails` can be a better solution, specially when you are working with multiple Tests.ps1 files.

![pester_tests_with_fails_summary_value](/2017/09/pester_tests_with_fails_summary_value.png)

This way you can see where your error come from.

### Reading and fixing the errors

As you can read from the last image from `-Show Failed` execution, the database "dbft" on "SQL2016" instance has the "AutoShrink" property set to "True" but we expect the value "False". Now you can go to the database properties and change this value!

Also, the "PageVerify" value that we expect to be "Checksum" is "TornPageDetection" for the database "dumpsterfire4" and "SQL2016" instance.

Finally the MaxMemory configuration on the "SQL2016" instance is set to 46080MB (45GB) but we expect that should be less than 18432mb (18GB) that is the total memory of the host. We need to reconfigure this value too.

### This is great!

Yes it is! Now when a new database is born on an existing instance, or you update your instances with a new one, you can simply run the tests and the new stuff will be included on this set of tests!

If you set it to run daily or even once per week you can check your estate and get new stuff that haven't been you to setup and maybe is not following the best practices.

Get the fails and email them (I will blog about it).

### Next steps

* Explore Pester syntax.
* Add new instances.
* Add new tests

* Check if you have access to the instance (great way to know quickly if some instance is stopped)
* Check if your backups are running with success and within our policy time interval
<li>Check if your datafiles are set to growth by fixed value and not percent. Also if that fixed value is more than X mb.
* Want to [Test your last backup](https://sqldbawithabeard.com/2017/03/25/using-pester-with-dbatools-test-dbalastbackup/)? Or something completely different like Rob's made for [Pester for Presentations – Ensuring it goes ok](https://sqldbawithabeard.com/2017/05/16/pester-for-presentations-ensuring-it-goes-ok/)? 

You name it!

## Want more?

I hope you have seen some new stuff and get some ideas from this blog post!

If you want to know if there will be some dbatools presentations near you, visit our [presentation page](https://dbatools.io/presentations/). You can find some of our presentations on our [youtube channel](https://dbatools.io/youtube) and code example on the [community presentations on GitHub](https://github.com/sqlcollaborative/community-presentations).

About Pester and other examples and use cases, we have the [Articles and other resources](https://github.com/pester/Pester/wiki/Articles-and-other-resources) page maintained by the Pester team.

I'm looking forward to read the other blog posts (follow the comments on Rob's post, or the roundup later) on this month's T-SQL Tuesdays and see what people is being doing with PowerShell.

Thanks for reading.
