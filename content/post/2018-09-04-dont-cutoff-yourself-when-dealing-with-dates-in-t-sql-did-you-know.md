---
author: claudiosilva
comments: true
date: "2018-09-04T00:00:00Z"
tags:
- dbatools
- Did You Know
- DidYouKnow
- SQLServer
- syndicated
title: Don't cutoff yourself with dates in T-SQL - Did you know...
---
Almost all the applications we use have a lot of options. And, sometimes we even stumble across them by accident.
Who's ever heard something like "Normal user don't even use 5% of Excel capabilities!"?

Other options, we know they exist but because the default value it’s ok (so far) we tend to forget it. It is just sitting there, waiting for the day we want/need to change it.

## The oddity

Few days ago I was talking with a friend that show me some "odd behavior" when working with dates on SQL Server.
<img src="https://claudioessilva.github.io/img/2018/09/oddity_ouput.png" alt="" width="656" height="186" class="aligncenter size-full wp-image-1544" />

### Are you mad?! Is this SQL Server bugged?

In case you ask, this is my table definition:

``` sql
CREATE TABLE DatesFormat
(
    dt DATETIMEOFFSET DEFAULT ('1900-01-01')
);
GO
```

Let's take a closer look at the `SELECT`.

<ol>
* On the 1st column, we can see the complete value of the column
* The 2nd column picks the year from the date column
* The 3rd one also picks the year from a datetime but declared as string.
</ol>

But why don't the 2nd and 3rd columns return the exact same value?!

#### What is your interpretation?

What do you read when you see some date in a format like "01-Jan-00 00:00:00.000"? Keep in mind that I'm talking about the output directly from the table and without any formatting.
1st of January seems to leave no doubt (just because there is no default date format starting with two digits for the year), but...what about the year part '00'?
It stands for 1900 and the 3rd column is wrong?
Or it stands for 2000 and the `DATEPART` function is returning the wrong value?

### Both are returning the correct value! Say hello to "Two Digit Year Cutoff" configuration

You can find it on the advanced tab in the Server Proprieties:
<img src="https://claudioessilva.github.io/img/2018/09/ssms_twodigityearcutoff.png" alt="" width="656" height="594" class="aligncenter size-full wp-image-1547" />
Or by running the [sp_configure](https://docs.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-configure-transact-sql) command:

``` sql
EXEC sp_configure 'show advanced options', 1;
GO
RECONFIGURE ;
GO
EXEC sp_configure 'two digit year cutoff';
GO
```
<img src="https://claudioessilva.github.io/img/2018/09/sp_configure_twodigityearcutoff.png" alt="" width="656" height="252" class="aligncenter size-full wp-image-1546" />

Or even using [dbatools](https://dbatools.io) PowerShell module:

``` powershell
Get-DbaSpConfigure -SqlInstance sql2016 -ConfigName 'TwoDigitYearCutoff'
```
Output:
<img src="https://claudioessilva.github.io/img/2018/09/dbatools_twodigityearcutoff1.png" alt="" width="655" height="243" class="aligncenter size-full wp-image-1565" />

That's right! [This option](https://docs.microsoft.com/en-us/sql/database-engine/configure-windows/configure-the-two-digit-year-cutoff-server-configuration-option?view=sql-server-2017) is the one that makes the last column value being translated to 2000 and not 1900.

If we change the configuration to 1999 instead of 2049 (default value) the result of the `DATEPART` will be 1900 but having it as 2049 will convert the year as 2000 (from the date that is a string).

The test:

``` sql
-- Check the running value
EXEC sp_configure 'two digit year cutoff';
GO

-- Notice the 3rd column
SELECT dt, DATEPART(YEAR, dt), DATEPART(YEAR, '01-Jan-00 12:00:00 AM +00:00')
  FROM dbo.DatesFormat
GO

-- Change the configuration
EXEC sp_configure 'two digit year cutoff', 1999;
GO
RECONFIGURE ;
GO

-- Confirm the running value
EXEC sp_configure 'two digit year cutoff';
GO

-- See the different value on the 3rd column
SELECT dt, DATEPART(YEAR, dt), DATEPART(YEAR, '01-Jan-00 12:00:00 AM +00:00')
  FROM dbo.DatesFormat
```

Output:
<img src="https://claudioessilva.github.io/img/2018/09/changesetting_checkdifferences.png" alt="" width="656" height="513" class="aligncenter size-full wp-image-1550" />

Remember, this only happens when you use a literal string.

To set a new value using dbatools:

``` powershell
Set-DbaSpConfigure -SqlInstance sql2016 -ConfigName 'TwoDigitYearCutoff' -Value 1999
```
Output:
<img src="https://claudioessilva.github.io/img/2018/09/dbatools_set_twodigityearcutoff1.png" alt="" width="656" height="132" class="aligncenter size-full wp-image-1566" />

### What about the returning value?

Yeah, I know, why is the value of the first column returned on that format? You are used to seeing in the format of `yyyy-MM-dd` right?
I'll explain this in a next post! Stay tuned.

### Summary

Next time you have to work with dates in formats like `dd-MMM-yy` remember that "Two Digit Year Cutoff" configuration exists and may mislead you.

To complete the question..."Did you know that 'Two Digit Year Cutoff' configuration can trick you?" Now you do.

Thanks for reading.
