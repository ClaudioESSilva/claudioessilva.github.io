---
layout: post
title: Is this command broken? I can't see some properties! - DefaultDisplayPropertySet, Get-Member and Select-Object *
date: 2018-04-23 14:28
author: claudiosilva
comments: true
tags: [DefaultDisplayPropertySet, Get-Member, PowerShell, PowerShell Tip, Scripting, Select-Object *]
---
Every now and again I see some people complaining about not getting the properties they want when using a PowerShell command.

For instance, someone was using the Get-Service command to query what was the "Startup Type" of <a href="https://blogs.technet.microsoft.com/jonjor/2009/01/09/winrm-windows-remote-management-troubleshooting/" rel="noopener" target="_blank">WinRM service</a>. For that the person used the following command:
``` powershell
Get-Service WinRM
```

which produces the following output:
<a href="https://claudioessilva.github.io/img/2018/04/01_getservice_winrm.png"><img src="https://claudioessilva.github.io/img/2018/04/01_getservice_winrm.png?w=656" alt="" width="656" height="93" class="aligncenter size-large wp-image-1331" /></a>

As you can see, the "Startup Type" property that we can find on the user interface does not appear here!

<h4>"Wait wait wait...what? Is the command broken?"</h4>

<h3>Fear nothing!</h3>

In this case, this property does not belong to the <strong>default display properties set</strong> but the properties are still there!

<h4>So how can we get the list of available properties?</h4>

First, let me say that this person knows that `Select-Object` can be used to select the properties we want, so he tried to guess the property name using a trial/error approach.

The person tried:
``` powershell
Get-Service WinRM | Select-Object Startup, Status, Name, DisplayName
```
<a href="https://claudioessilva.github.io/img/2018/04/02_getservice_winrm_startupprop.png"><img src="https://claudioessilva.github.io/img/2018/04/02_getservice_winrm_startupprop.png?w=656" alt="" width="656" height="82" class="aligncenter size-large wp-image-1332" /></a>

and also:
``` powershell
Get-Service WinRM | Select-Object StartupType, Status, Name, DisplayName
```
<a href="https://claudioessilva.github.io/img/2018/04/03_getservice_winrm_startuptypeprop.png"><img src="https://claudioessilva.github.io/img/2018/04/03_getservice_winrm_startuptypeprop.png?w=656" alt="" width="656" height="76" class="aligncenter size-large wp-image-1333" /></a>

But all of them were just empty.

Let me invoke a cliché but yet, still true:
When I, and probably most of the people, started learning PowerShell, we learn that Get-Member (and also Get-Help) are our two best friends.

<a href="https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-help?view=powershell-6" rel="noopener" target="_blank">Get-Help</a> needs no introduction, it will retrieve the help for a command! You should always start by reading the help of the command, you will find the overall description, parameters explained and even examples on how to execute the command.

On the other hand, <a href="https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-member?view=powershell-6" rel="noopener" target="_blank">Get-Member</a> can be not so obvious for people that are not familirized with OOP (<a href="https://en.wikipedia.org/wiki/Object-oriented_programming" rel="noopener" target="_blank">Object-oriented programming</a>). Looking on documentation we can see that this command

<blockquote>Gets the properties and methods of objects.</blockquote>

This means it can give you a variety of information on the objects you are working with, including, for our use case, the available properties.

Let's see if we can find the property we want. We can do this by piping the command we are working with to Get-Member.
``` powershell
Get-Service | Get-Member
```

<a href="https://claudioessilva.github.io/img/2018/04/04_getservice_getmember.png"><img src="https://claudioessilva.github.io/img/2018/04/04_getservice_getmember.png?w=656" alt="" width="656" height="375" class="aligncenter size-large wp-image-1334" /></a>

We can see all the member types, but since we know we want to search on properties we can filter it down using:
``` powershell
Get-Service | Get-Member -MemberType Property
```
<a href="https://claudioessilva.github.io/img/2018/04/05_getservice_getmember_properties.png"><img src="https://claudioessilva.github.io/img/2018/04/05_getservice_getmember_properties.png?w=656" alt="" width="656" height="240" class="aligncenter size-large wp-image-1335" /></a>

If it retrieves a big list we can also add a filter by the name we think it has like "Start"
``` powershell
Get-Service | Get-Member -MemberType Property -Name Start*
```
<a href="https://claudioessilva.github.io/img/2018/04/06_getservice_getmember_properties_filter.png"><img src="https://claudioessilva.github.io/img/2018/04/06_getservice_getmember_properties_filter.png?w=656" alt="" width="656" height="134" class="aligncenter size-large wp-image-1336" /></a>

And, in this case we narrow it down to just one result - `StartType`. Let's try to include on our original command.

``` powershell
Get-Service WinRM | Select-Object StartType, Status, Name, DisplayName
```
<a href="https://claudioessilva.github.io/img/2018/04/07_getservice_winrm_with_starttype.png"><img src="https://claudioessilva.github.io/img/2018/04/07_getservice_winrm_with_starttype.png?w=656" alt="" width="656" height="71" class="aligncenter size-large wp-image-1337" /></a>

Boom! We now have the property we are looking for!

<h3>Select-Object *</h3>

I mentioned the `Select-Object *` on the title of this post, that is because we can use it to get ALL existing properties that our object owns and their values.

``` powershell
Get-Service WinRM | Select-Object *
```

<a href="https://claudioessilva.github.io/img/2018/04/08_getservice_winrm_selectstar.png"><img src="https://claudioessilva.github.io/img/2018/04/08_getservice_winrm_selectstar.png?w=656" alt="" width="656" height="352" class="aligncenter size-large wp-image-1338" /></a>
As you can see we can find the `StartType` there.

<h3>Why hide some properties by default?</h3>

This way it will become cleaner and faster.
<strong>Faster:</strong> We can have 20 properties but if only 5 are the most useful, by setting this five the default the command will be faster than if we retrieve the whole 20 properties.
<strong>Cleaner:</strong> We don't fill the screen with information that 90% of the time is not useful for us.

<h3>Can we know beforehand what are the default properties of a command?</h3>

Yes, we can! And it is very easy actually.

Using our initial example:
``` powershell
(Get-Service WinRM).PSStandardMembers.DefaultDisplayPropertySet
```

<a href="https://claudioessilva.github.io/img/2018/04/09_getservice_winrm_defaulproperties.png"><img src="https://claudioessilva.github.io/img/2018/04/09_getservice_winrm_defaulproperties.png?w=656" alt="" width="656" height="128" class="aligncenter size-large wp-image-1339" /></a>

There they are.

Getting the full list of properties:
``` powershell
(Get-Service WinRM).PSStandardMembers.DefaultDisplayPropertySet.ReferencedPropertyNames
```
<a href="https://claudioessilva.github.io/img/2018/04/10_getservice_winrm_defaulpropertieslist.png"><img src="https://claudioessilva.github.io/img/2018/04/10_getservice_winrm_defaulpropertieslist.png?w=656" alt="" width="656" height="41" class="aligncenter size-large wp-image-1340" /></a>

<h3>Bonus</h3>

If you use some properties a lot and they are not part of the defaults, or you just would like to change the default properties that are retrieved, you can use the `<a href="https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/update-typedata?view=powershell-6" rel="noopener" target="_blank">Update-TypeData</a>` or `<a href="https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/update-formatdata?view=powershell-6" rel="noopener" target="_blank">Update-FormatData</a> `cmdlets to make it work that way.

Quick note: For commands that have format XML you will need to use the Update-FormatData.
Thanks to Friedrich Weinmann (<a href="https://allthingspowershell.blogspot.co.uk/" rel="noopener" target="_blank">b</a> \| <a href="https://twitter.com/FredWeinmann" rel="noopener" target="_blank">t</a>), (dbatools architect) that helped me to realize this!

<h3>Wrap</h3>

This post was intended to show / remember how you can know what are the default properties that will be shown when you run a command. Also, I showed two ways to get the full list of properties Get-Member (just the property name) and "Select-Object *" which also retrieve the values.

Thanks for reading!
