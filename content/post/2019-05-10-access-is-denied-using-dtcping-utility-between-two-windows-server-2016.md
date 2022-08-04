---
author: claudiosilva
comments: true
date: "2019-05-10T00:00:00Z"
tags:
- Access is denied
- Cluster
- Documentation
- Firewall
- MSDTC
- RPC
- Rules
- SQLServer
- syndicated
- Windows Server 2016
- WSFC
title: Access is denied - Using DTCPing utility between two Windows Server 2016
---
<img src="https://claudioessilva.github.io/img/2019/05/featureimage_smaller-1.png" alt="" width="800" height="297" class="aligncenter size-full wp-image-1666" />

Few days ago a client requested the configuration of MSDTC (Microsoft Distributed Transaction Coordinator).

NOTE: If you want to know more about it here is a nice FAQ from Microsoft blogs - [MSDTC Recommendations on SQL Failover Cluster](https://blogs.msdn.microsoft.com/alwaysonpro/2014/01/15/msdtc-recommendations-on-sql-failover-cluster)?

The client has 2 machines: one an application server and one a database server.

Both run on Windows Server 2016 OS and, the database server runs SQL Server 2016 using Availability Groups feature (where their databases resides).

This seems normal... but actually SQL Server 2016 SP2 is the first version that provides <strong>full support for distributed transactions in availability groups</strong>.
For more info take a look on [Transactions - availability groups and database mirroring](https://docs.microsoft.com/en-us/sql/database-engine/availability-groups/windows/transactions-always-on-availability-and-database-mirroring) help page.

## Configuration

To configure the MSDTC correctly, you can/should follow all the check lists on the [How to cluster the DTC service for an Always On availability group](https://docs.microsoft.com/en-us/sql/database-engine/availability-groups/windows/cluster-dtc-for-sql-server-2016-availability-groups).

## "Ok, but you mentioned 'Access is denied' error on the title" - Here is the story behind it

To test and/or troubleshoot if the configuration of MSDTC is correct you can rely on two main utilities:<br />
 - [DTCTester](https://www.microsoft.com/en-ca/download/details.aspx?id=30746) - Tests the transactions between two computers if SQL Server is installed on one computer, using ODBC to verify transaction support against an SQL Server database.
 - [DTCPing](https://www.microsoft.com/en-ca/download/details.aspx?id=2868) - Tests the transaction support between two computers without testing SQL Server duties. The DTCPing tool must be run on both the client and server computer. Read more on [Troubleshooting MSDTC issues with the DTCPing tool](https://blogs.msdn.microsoft.com/puneetgupta/2008/11/12/troubleshooting-msdtc-issues-with-the-dtcping-tool/)

The client requested a test with DTCPing utility. After hitting the "The RPC server is unavailable" error which can be overpass by open the correct firewall rules, I was hitting the "Access is Denied" error.
I read, once again, the troubleshooting post but the explanation/resolution for this error did not fit on my configuration (remember the application server is an Windows Server 2016 not an "client OS" (AKA windows 7/8/10) as mentioned on the post.
I tryied my [google-fu](https://www.urbandictionary.com/define.php?term=google-fu) to find more answers but...nothing. Every single response where people solved their issues fits on the troubleshooting post.
I talked with my colleague from the firewall team just to double-check that the traffic was not being blocked at all. It was OK. Everything going on...so it should be something different.

## When nothing else fits, you need to try anything

The documentation ([Troubleshooting MSDTC issues with the DTCPing tool](https://blogs.msdn.microsoft.com/puneetgupta/2008/11/12/troubleshooting-msdtc-issues-with-the-dtcping-tool/)) mention "Windows XP" and "Windows VISTA" but this article is from 2008. Translating for today this should apply to Windows 7/8/10, even so, I decided go give it a try and change on the Windows Server 2016 machines the registry key mentioned.
Guess what?! It worked!!!

In this case, I had to ignore the statement: "This error will only occur if the destination machine is a Windows XP machine or a Windows VISTA machine."

This blog post is to document this so other people that face the same problem can know they should try.

## Final thoughts

When nothing else seems to work and you have some notes saying that it only applies to specific versions/scenarios, sometimes it worth trying on your scenario. Assumptions can change over time.

Thanks for reading.
