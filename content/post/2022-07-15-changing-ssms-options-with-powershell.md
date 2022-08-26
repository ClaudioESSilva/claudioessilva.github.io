---
author: claudiosilva
comments: true
date: "2022-07-15T00:00:00Z"
image: null
tags:
- SQLServer
- SSMS
- PowerShell
- Registry
- Tools
- syndicate
title: Changing SSMS options with PowerShell
draft: true

autoThumbnailImage: false
thumbnailImagePosition: "top"
thumbnailImage: /img/2022/06/Exceptions_see_of_read_WinPS_small.png
coverImage: /img/2022/06/Exceptions_see_of_read_WinPS.png
metaAlignment: center
coverMeta: out
---

A short one today, so I can document a script I have created to change the SSMS options via PowerShell.

## The why

In my new job at Data Masterminds we need to connect to different clients with different jumpboxes.
There we will have SSMS installed to to our work.
The 1st time I need to connect to a new client I need to configure the SSMS in the way I like and therefore here it goes a bunch of "click"-"click"-"finish"

``` PowerShell
$propertiesCol = @{
    "HKCU:\SOFTWARE\Microsoft\SQL Server Management Studio\18.0_IsoShell\Text Editor\SQL" = @{
        "Line Numbers" = 1
        "UseMapMode" = 1
    }
    "HKCU:\SOFTWARE\Microsoft\SQL Server Management Studio\18.0_IsoShell\ApplicationPrivateSettings\WindowManagement\Options" = $colProperties = @{
        "ShowPinnedTabsInSeparateRow" = "0*System.Boolean*True"
    }
}

foreach ($prop in $propertiesCol.Keys) {
    Write-Host "Changing keys on path: $prop"
    
    $configs = $($propertiesCol.$prop)

    foreach ($config in $configs.Keys) {
        Write-Host "Changing config: $config to $($configs.$config)"

        Set-ItemProperty -Path $prop -Name $config -Value $($configs.$config)
    }
}

$userSettings = "C:\Users\CláudioSilva\AppData\Roaming\Microsoft\SQL Server Management Studio\18.0\UserSettings.xml"
[xml]$info = Get-Content $userSettings
$info.SelectSingleNode('//RetainCRLFOnCopyOrSave').'#text' = "true"

$info.Save($userSettings)
```
