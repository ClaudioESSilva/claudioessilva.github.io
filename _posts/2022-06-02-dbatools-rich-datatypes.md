---
layout: post
title: dbatools - Rich Datatypes
date: 2022-06-02 14:00
author: claudiosilva
comments: true
tags: [dbatools, PowerShell, SQLServer, syndicate]
---

Some datatypes can be shown in so many different forms (think measurament units, dates with short/long forms, or regional settings) that can be difficult to have a standard.

What should we show? Sizes should be always in bytes? It will be easier for you to interpret `1610612736 bytes` or `1.50 GB`?

That's why we have created some rich datatypes like, `DbaTime`, `DbaDate`, `DbaDatetime`, `DbaTimeSpan`, `PrettyTimeSpan` or `DbaSize` to make it easier to read and be more consistent acrross multiple commands.

## How to identify the property datatype?
When we run a command, just by looking into the output we can't infer the datatypes being used by each property.

To check a  property datatype we can make use of `Get-Member` cmdlet.

NOTE: I'm using our [docker images](https://dbatools.io/docker) to run the example.

``` powershell
$dbaDbSpace = Get-DbaDbSpace -SqlInstance localhost:14334 -SqlCredential (Get-Credential -UserName sqladmin) -Database StackOverflow
$dbaDbSpace | Get-Member
```

![Size_datatype](/img/2022/06/Size_datatype.png)


This shows that some of our proprieties are of the type of `Size`. 

If we go one level deeper and run
``` powershell
$dbaDbSpace.FileSize | Get-Member
```

We can then see the full `TypeName` that our property `FileSize` has - `Sqlcollaborative.Dbatools.Utility.Size`.

![FileSize_properties](/img/2022/06/FileSize_properties.png)

And, as we can also see from the output, this type as multiple properties.

This means that we can easily get the value in any of the other different units available just by reading that property.

Example if you want to read the `FileSize` in `Byte` for the data file, you can get it like this: 
``` powershell
($dbaDbSpace | Where-Object FileType -eq 'Rows').FileSize.Byte
```

![FileSize_rows_byte](/img/2022/06/FileSize_rows_byte.png)


If you want to see all properties and values
``` powershell
$dbaDbSpace | Where-Object FileType -eq 'Rows' | Select-Object -ExpandProperty FileSize
```

![FileSize_properties_values](/img/2022/06/FileSize_properties_values.png)


### DbaDateTime
On a different example let's use the `Get-DbaInstanceInstallDate` command to show that the `SqlInstallDate` has the `DbaDateTime` datatype.

![DbaDateTime](/img/2022/06/DbaDateTime.png)

To show the differences between native `Datetime` and our `DbaDateTime` you can run the following code:

``` PowerShell
$DateTime = [pscustomobject]@{
   nativeDT = [DateTime]::new(2022, 6, 2, 13, 10, 30)
   dbatoolsDT = [DbaDateTime]::new(2022, 6, 2, 13, 10, 30)
}

$DateTime
```


![Datetime_vs_DbaDateTime](/img/2022/06/Datetime_vs_DbaDateTime.png)


### PrettyTimespan

`PrettyTimespan` is another rich datatype that we use, as example, at `Test-DbaNetworkLatency` or `Import-DbaCsv` commands.

Here is an out of the box example comparing native vs dbatools:
``` PowerShell
$timespan = [pscustomobject]@{
   nativeTimespan = [Timespan]::FromMilliseconds(29.69)
   dbatoolsPrettyTimespan = [PrettyTimespan]::FromMilliseconds(29.69)
}

$timespan
```

![PrettyTimeSpan](/img/2022/06/PrettyTimeSpan.png)


Which one is prettier? :-)


If you are curious how we do it, here is an example. When the timespan is less than 1 second, [we format](https://github.com/dataplat/dbatools/blob/development/bin/projects/dbatools/dbatools/Utility/DbaTimeSpanPretty.cs#L112) the value as `XX ms`


## Defaults and configurations
Out of the shelf, dbatools uses some defaults.

![Get-DbatoolsConfig_formatting](/img/2022/06/Get-DbatoolsConfig_formatting.png)

You can find them using the `Get-DbatoolsConfig -Module formatting` command.

Note: Make sure you read our [configuration](https://dbatools.io/configuration) post to learn more about them.


## Configuration example
Let’s say you want to see your DateTime using the 12 hour format (with AM and PM) instead of 24h and without the milliseconds.  
We can make it by changing the `formatting.datetime` configuration

``` PowerShell
Set-DbatoolsConfig -FullName formatting.datetime -Value 'yyyy-MM-dd hh:mm:ss tt'
```

Now, if we output the content of our `$DateTime` used before we see the new format for the `DbaDateTime`.

![Set-DbatoolsConfig_datetime](/img/2022/06/Set-DbatoolsConfig_datetime.png)


Hopefully you find this information useful and now you can easily adjust to your needs. :-)

Thanks for reading!