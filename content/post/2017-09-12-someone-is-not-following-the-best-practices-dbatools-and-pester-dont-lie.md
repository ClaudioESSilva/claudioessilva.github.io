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
title: Someone is not following the best practices - dbatools and Pester don't lie!
---
<a href="https://sqldbawithabeard.com/2017/09/05/tsql2sday-94-lets-get-all-posh/"><img class="size-full wp-image-599 alignleft" src="https://claudioessilva.github.io/img/2017/09/tsql2sday.jpg" alt="" width="244" height="244" /></a>This month’s T-SQL Tuesday is brought to us by my good friend Rob Sewell (<a href="https://sqldbawithabeard.com" target="_blank" rel="noopener">b</a> \| <a href="https://twitter.com/sqldbawithbeard" target="_blank" rel="noopener">t</a>). Together “Let’s get all Posh – What are you going to automate today?”

I have written some blog posts on how I use PowerShell to automate mundane tasks or some other more complex scenarios like:  <a href="http://redglue.org/find-and-fix-sql-server-databases-with-empty-owner-property-using-dbatools-powershell-module/" target="_blank" rel="noopener">Find and fix SQL Server databases with empty owner property using dbatools PowerShell module</a> or <a href="http://redglue.org/have-you-backed-up-your-sql-logins-today/" target="_blank" rel="noopener">Have you backed up your SQL Logins today?</a>  or even using ReportingServicesTools module for deploy reports - <a href="http://redglue.org/ssrs-report-deployment-made-easy-700-times-faster/" target="_blank" rel="noopener">SSRS Report Deployment Made Easy – 700 times Faster</a>.

But today I want to bring something little different.  This year, back in May I saw two presentations from Rob about using Pester to do unit tests for our PowerShell code and also to validate options/infrastructure like checklists. This got my attention and made me want to play with it!

Therefore, I want to share an example with you using two of my favorite PowerShell modules dbatools and Pester.
## Let's play a game
You go to a client or you have just started working on your new employer and you want to know if the entire SQL Server state complies with the best practices.

For the propose of this blog, we will check:
<ul>
 	<li>if our databases (from all instances) have the following configurations:
<ul>
 	<li>PageVerify -> Checksum</li>
 	<li>AutoShrink -> False</li>
</ul>
</li>
 	<li>if each SQL Server instance:
<ul>
 	<li>has the MaxMemory setting configured to a value lower than the total existing memory on the host.</li>
</ul>
</li>
</ul>
How would you do that?
### Let me introduce to you - dbatools
For those who don’t know, <a href="https://github.com/sqlcollaborative/dbatools/" target="_blank" rel="noopener">dbatools is a PowerShell module</a>, written by the community, that makes SQL Server administration much easier using PowerShell. Today, the module has more than 260 commands. Go get it (<a href="http://dbatools.io" target="_blank" rel="noopener">dbatools.io</a>) and try it! If you have any doubt you can join the team on the #dbatools channel at the <a href="https://dbatools.io/slack" target="_blank" rel="noopener">Slack – SQL Server Community</a>.

In this post I will show some of those commands and how they can help us.

Disclaimer: Obviously this <strong>is not the only way</strong> to accomplish this request, but for me, is <strong>one excellent way!</strong>
### Get-DbaDatabase command
One existing command on the dbatools swiss army knife is <a href="https://dbatools.io/functions/get-dbadatabase/" target="_blank" rel="noopener">Get-DbaDatabase</a>.
As it states on the command description
<blockquote>The Get-DbaDatabase command gets SQL database information for each database that is present in the target instance(s) of SQL Server. If the name of the database is provided, the command will return only the specific database information.</blockquote>
This means that I can run the following piece of PowerShell code and get some information about my databases:

``` powershell
Get-DbaDatabase -SqlServer sql2016 | Format-Table
```

This returns the following information from all existing databases on this SQL2016 instance.

<a href="https://claudioessilva.github.io/img/2017/09/get-dbadatabase_sql2016_ft.png"><img class="aligncenter size-large wp-image-579" src="https://claudioessilva.github.io/img/2017/09/get-dbadatabase_sql2016_ft.png?w=656" alt="" width="656" height="284" /></a>
#### Too little information
That's true, when we look to it, it brings not enough information. I can't even get the "PageVerify" and "AutoShrink" properties that I want. But that is because we, by default, only output a bunch of properties and this doesn't mean that the others are not there.

To confirm this we can run the same code without the " | Format-Table" that is useful to output the information in a table format but depending on the size of your window it can show more or less columns.
By running the command without the "format-table" we can see the following (just showing the first 3 databases):

<a href="https://claudioessilva.github.io/img/2017/09/get-dbadatabase_sql2016_without_ft2.png"><img class="aligncenter size-full wp-image-582" src="https://claudioessilva.github.io/img/2017/09/get-dbadatabase_sql2016_without_ft2.png" alt="" width="617" height="607" /></a>

Now, we can see more properties available look to the ones inside the red rectangle.
#### I continue not to see the ones I want
You are right. But as I said before that does not means they aren't there.
To simplify the code let's assign our output to a variable named `$databases` and then we will have a look to all the Members existing on this object

``` powershell
$databases = Get-DbaDatabase -SqlServer sql2016
$databases | Get-Member
```

Now we get a lot of stuff! The <a href="https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-member?view=powershell-5.1" target="_blank" rel="noopener">Get-Member cmdlet</a> say to us which Properties and Methods of the object (in this case the `$databases`).

This means that I can use a filter to find results with "auto" in its name:

``` powershell
$databases | Get-Member | Where-Object Name -like *auto*
```

Some cmdlets have parameters that allow us to filter information without the need to pipeing it so<ins>,</ins> the last line command could be written as:

``` powershell
$databases | Get-Member -Name *auto*
```

Which will output something like this:

<a href="https://claudioessilva.github.io/img/2017/09/databases_gm_whereauto.png"><img class="aligncenter size-large wp-image-583" src="https://claudioessilva.github.io/img/2017/09/databases_gm_whereauto.png?w=656" alt="" width="656" height="164"></a>

So, we have found our "AutoShrink" property. With this in mind, lets query all the properties we want.
``` powershell
$databases | Select-Object SqlInstance, Name, AutoShrink, PageVerify
```

And here we have the result:

<a href="https://claudioessilva.github.io/img/2017/09/databases_data.png"><img class="aligncenter size-large wp-image-584" src="https://claudioessilva.github.io/img/2017/09/databases_data.png?w=656" alt="" width="656" height="351" /></a>
### Scaling for multiple instances
This is where the fun begins.
We can pass multiple instance names and the command will go through all of them and output a single object with the data.

``` powershell
$databases = Get-DbaDatabase -SqlServer sql2016, sql2012
$databases | Select-Object SqlInstance, Name, AutoShrink, PageVerify
```

Which outputs:

<a href="https://claudioessilva.github.io/img/2017/09/get-dbadatabase_sql2016_sql20121.png"><img class="aligncenter size-large wp-image-592" src="https://claudioessilva.github.io/img/2017/09/get-dbadatabase_sql2016_sql20121.png?w=656" alt="" width="656" height="471" /></a>

As you can see I have passed two different instances sql2016 (in red) and sql2012 (in green) and the output brought both information.
### Using Out-GridView to filter results
We can use another PowerShell native cmdlet called <a href="https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/out-gridview?view=powershell-5.1" target="_blank" rel="noopener">Out-GridView</a> to show our results in a grid format. This grid also make it possible to use filters.
For the next example, I have misconfigurated two databases so we can find them among the others.

``` powershell
$databases | Select-Object SqlInstance, Name, AutoShrink, PageVerify | Out-GridView
```

<a href="https://claudioessilva.github.io/img/2017/09/databases_data_ogv.png"><img class="aligncenter size-large wp-image-586" src="https://claudioessilva.github.io/img/2017/09/databases_data_ogv.png?w=656" alt="" width="656" height="613" /></a>

As you can see, inside red rectangles we have two not optimal configurations regarding the SQL Server best practices. You can also see the green rectangle on the top left corner where you can type text and the results will be filter as you type. So if you type "true" you will end just with one record.

<a href="https://claudioessilva.github.io/img/2017/09/databases_data_ogv_filter.png"><img class="aligncenter size-large wp-image-587" src="https://claudioessilva.github.io/img/2017/09/databases_data_ogv_filter.png?w=656" alt="" width="656" height="164" /></a>
### Checking the MaxMemory configuration
Now, that you have seen how to do it for one command, you can start exploring the other ones. As I said in the beginning of this post we will also check the MaxMemory setting for each instance. We will use the <a href="https://dbatools.io/functions/get-dbamaxmemory/" target="_blank" rel="noopener">Get-DbaMaxMemory</a>. From the help page we can see the description that says:
<blockquote>This command retrieves the SQL Server ‘Max Server Memory’ configuration setting as well as the total physical installed on the server.</blockquote>
Let's run it through our two instances:

``` powershell
Get-DbaMaxMemory -SqlInstance sql2012, sql2016
```

<a href="https://claudioessilva.github.io/img/2017/09/get-dbamaxmemory_2instances.png"><img class="aligncenter size-full wp-image-588" src="https://claudioessilva.github.io/img/2017/09/get-dbamaxmemory_2instances.png" alt="" width="497" height="176" /></a>

We can see that SQL2012 instance is running on a host with 6144MB of total memory but its MaxMemory setting is set to 3072MB and also, SQL2016 instance has 4608MB configured form the 18423MB existing on the host.
## Final thought on this fast introduction to dbatools PowerShell module
As you see, it is pretty easy to run the commands for one or multiple instances to get information to work on. Also you have seen different ways to output that information.
I encourage you to use the <a href="https://dbatools.io/functions/find-dbacommand/" target="_blank" rel="noopener">Find-DbaCommand</a> to discover what other commands exists and what they can do for you.

Example, if you want to know which commands we have that works with "memory" you can run the following code:

``` powershell
Find-DbaCommand -Pattern memory
```

<a href="https://claudioessilva.github.io/img/2017/09/find-dbacommand.png"><img class="aligncenter size-large wp-image-590" src="https://claudioessilva.github.io/img/2017/09/find-dbacommand.png?w=656" alt="" width="656" height="140" /></a>
## Automating even more
Using the dbatools module we could verify if the best practice is in place or not. But we had to run the command and then verify the values by filtering and looking for each row.

You may be thinking that must exists some other more automated method to accomplish that, right?
### Say hello to Pester PowerShell module
<a href="https://github.com/pester/Pester" target="_blank" rel="noopener">Pester</a> is unit test framework for PowerShell. I like to say <em>If you can PowerShell it, you can Pester it</em>.
<blockquote>Pester provides a framework for running Unit Tests to execute and validate PowerShell commands. Pester follows a file naming convention for naming tests to be discovered by pester at test time and a simple set of functions that expose a Testing DSL for isolating, running, evaluating and reporting the results of PowerShell commands.</blockquote>
Please see <a href="https://github.com/pester/Pester/wiki/Installation-and-Update" target="_blank" rel="noopener">how to install Pester module here</a>.

With this framework, that I really encourage you to read more about it on the <a href="https://github.com/pester/Pester/wiki/Pester" target="_blank" rel="noopener">project Wiki</a>, we can automate our tests and make it do the validations for us!

As quick example - if we run the following code:

We are checking if the login returned by the `whoami` is base\claudio.

<a href="https://claudioessilva.github.io/img/2017/09/pester_whoami_ok.png"><img class="aligncenter size-full wp-image-594" src="https://claudioessilva.github.io/img/2017/09/pester_whoami_ok.png" alt="" width="481" height="196" /></a>

This return green which means it's ok!

If is not ok (because I'm testing to "base\claudio.silva"), will retrieve something like this:

<a href="https://claudioessilva.github.io/img/2017/09/pester_whoami_nok.png"><img class="aligncenter size-large wp-image-595" src="https://claudioessilva.github.io/img/2017/09/pester_whoami_nok.png?w=656" alt="" width="656" height="197" /></a>
### Quick walkthrough on Pester syntax
As you can see, to do a test we need a:
<ul>
<li><a href="https://github.com/pester/Pester/wiki/Describe" target="_blank">Describe block</a> (attention: the "{" must be on the same line!)</li>
<ul><li>Inside it, the <a href="https://github.com/pester/Pester/wiki/Context" target="_blank">Context block</a></li>
<ul><li>And inside the Context block the validation that we want to do the <a href="https://github.com/pester/Pester/wiki/It" target="_blank">It</a> and <a href="https://github.com/pester/Pester/wiki/Should" target="_blank">Should</a>. </li></ul></ul>
</ul>

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

<a href="https://claudioessilva.github.io/img/2017/09/pester_tests_with_fails.png"><img class="aligncenter size-large wp-image-596" src="https://claudioessilva.github.io/img/2017/09/pester_tests_with_fails.png?w=656" alt="" width="656" height="754" /></a>
### To much noise - can't find the failed tests easily
You are right, showing all the greens make us lose the possible red ones. But Pester has an option to show just the failed tests.

``` powershell
Invoke-Pester .\SQLServerBestPractices.Tests.ps1 -Show Failed
```

<a href="https://claudioessilva.github.io/img/2017/09/pester_tests_with_show_failed_only.png"><img class="aligncenter size-large wp-image-597" src="https://claudioessilva.github.io/img/2017/09/pester_tests_with_show_failed_only.png?w=656" alt="" width="656" height="199" /></a>

But, be aware that `-Show Fails` can be a better solution, specially when you are working with multiple Tests.ps1 files.

<img style="max-width:100%;" src="https://claudioessilva.github.io/img/2017/09/pester_tests_with_fails_summary_value.png" />

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
<ul>
 	<li>Explore Pester syntax.</li>
 	<li>Add new instances.</li>
<li>Add new tests</li>
<ul>
<li>Check if you have access to the instance (great way to know quickly if some instance is stopped)</li>
<li>Check if your backups are running with success and within our policy time interval</li>
<li>Check if your datafiles are set to growth by fixed value and not percent. Also if that fixed value is more than X mb.
<li>Want to <a href="https://sqldbawithabeard.com/2017/03/25/using-pester-with-dbatools-test-dbalastbackup/" target="_blank" rel="noopener">Test your last backup</a>? Or something completely different like Rob's made for <a href="https://sqldbawithabeard.com/2017/05/16/pester-for-presentations-ensuring-it-goes-ok/" target="_blank" rel="noopener">Pester for Presentations – Ensuring it goes ok</a>? </li>
</ul>
</ul>
You name it!
## Want more?
I hope you have seen some new stuff and get some ideas from this blog post!

If you want to know if there will be some dbatools presentations near you, visit our <a href="https://dbatools.io/presentations/" target="_blank" rel="noopener">presentation page</a>. You can find some of our presentations on our <a href="https://dbatools.io/youtube" target="_blank" rel="noopener">youtube channel</a> and code example on the <a href="https://github.com/sqlcollaborative/community-presentations" target="_blank" rel="noopener">community presentations on GitHub</a>.

About Pester and other examples and use cases, we have the <a href="https://github.com/pester/Pester/wiki/Articles-and-other-resources" target="_blank" rel="noopener">Articles and other resources</a> page maintained by the Pester team.

I'm looking forward to read the other blog posts (follow the comments on Rob's post, or the roundup later) on this month's T-SQL Tuesdays and see what people is being doing with PowerShell.

Thanks for reading.
