---
layout: post
title: Change Outlook sender mailbox with PowerShell - A workaround
date: 2020-02-12 15:45
author: claudiosilva
comments: true
tags: [ComObject, InvokeMember, Mail, Outlook, PowerShell, reflection, Scripting, Security, Sender, SendUsingAccount, SetProperty, syndicated]
---
The idea of this blog post, like many others I write, is to document a workaround solution to my problem. Hopefully I can also help someone that may be looking for the solution for this problem and stumbles accidentally (or not) on my blog.

<h2>Scenario</h2>

I was helping a colleague automating the creation of emails using Microsoft Outlook using PowerShell. The following are configurable options (these will be the parameters of the script):

<ul>
    <li>list of TO email addresses</li>
    <li>list of CC email addresses</li>
    <li>Signed and Encrypted (they are being forced)</li>
    <li>Subject</li>
    <li>Keep the default signature but add the message before</li>
    <li>Sender can be different that the default (example: use team's email instead the personal one)</li>
</ul>

We can use the COM object to create Outlook objects.

``` powershell
$Outlook = New-Object -ComObject Outlook.Application
```

We need to get the MAPI namespace and logon on the default profile (or existing session)
``` powershell
#Get the MAPI namespace.
$namespace = $Outlook.GetNameSpace("MAPI")

# Log on by using the default profile or existing session (no dialog box).
$namespace.Logon($null, $null, $false, $true);
```

<blockquote>Note: To do this you need to be running your PowerShell session with the same privileges. If you are running Outlook as a non-administrator (and you should!) you need to open a PowerShell session with the same privilege level.</blockquote>

Then, we need to create a new Mail item
``` powershell
# Create new email
$Mail = $Outlook.CreateItem(0)
$Mail.GetInspector.Activate()
```

<blockquote>Note: The second line (`Activate()`) is being used because the mail will not be sent automatically, it will be a manual process after the colleague checks a couple of things. This way, activate will bring the focus to the window and this way we can see the magic happening!</blockquote>

To set the To and CC (which is optional) emails is easy as setting the properties' values.
``` powershell
$Mail.To = $EmailTo
if ($EmailCC) {
   $Mail.Cc = $EmailCC
}
```

Adding the `Subject`
``` powershell
$Mail.Subject = $EmailSubject
```

To sign and/or encrypt the email we need to set like this:
``` powershell
#Sign and Encrypt email
$Mail.PropertyAccessor.SetProperty("http://schemas.microsoft.com/mapi/proptag/0x6E010003", 0x03)
```
The possible values are:

<ul>
0x00 - Message has no security
0x01 - Message is encrypted
0x02 - Message is signed
0x03 - Message is signed and encrypted
</ul>

<h4>Keeping the signature</h4>

After opening the message we can get the current HTML of the body which will include the default signature (with images, links, etc)
``` powershell
# Get default signature
$signature = $Mail.HtmlBody
```

Then we can just add our `$EmailHtmlBody` parameter and append the `$signature`
``` powershell
$Mail.HtmlBody = $EmailHtmlBody + $signature
```

<h3>The problem</h3>

Finally, from our list of properties to be changed we have the sender mailbox.

Using the `SendUsingAccount` property I tried to set the email address that I wanted. But...no luck!

<h3>Using `Get-Member` to know more</h3>

I took a closer look and using the `Get-Member` I was able to be sure what data type this property accepts.
<img src="https://claudioessilva.github.io/img/2020/02/sendingusingaccount_datatype.png" alt="" width="515" height="156" class="aligncenter size-full wp-image-1908" />

As we can see it expects an object of type `Account`.

<h3>Now will work, right?!</h3>

To get the account as an `account` type I have used the following code where the `$EmailFrom` variable contains the email address I want to use:
``` powershell
#Get account object from email addres
$account = $outlook.Session.Accounts.Item($EmailFrom)
```

<blockquote>NOTE: You need to have this email address configured on your Outlook, otherwise this will not work.</blockquote>

With our `$account` variable set let's assign it to our `SendUsingAccount` mail object property.
``` powershell
$Mail.SendUsingAccount = $account
```

But...this also didn't work!
All the others properties were pretty easy to change so I didn't expect that.

<h2>Time for some google-fu</h2>

After googleing for a bit I found an generic (works for many objects) alternative way to set a property to an object

``` powershell
function Invoke-SetProperty {
    # Auxiliar function to set properties. The SendUsingAccount property wouldn't be set in a different way
    param(
        [__ComObject] $Object,
        [String] $Property,
        $Value
    )
    [Void] $Object.GetType().InvokeMember($Property,"SetProperty",$NULL,$Object,$Value)
}
```

I have put this code as an internal function. So, inside our code we can call it like this:
``` powershell
#Change Sender mailbox
Invoke-SetProperty -Object $mail -Property "SendUsingAccount" -Value $account
```

And finally, it worked!

<h3>Conclusion</h3>

In this case we are using <a href="https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/reflection" rel="noopener" target="_blank">reflection</a> (by calling InvokeMember()) .Normally we use this, for example, when we want to change private properties of an object. I’m not sure in this case why the “normal” way didn’t work but, at least, this can be used as a workaround for the future in case other similar cases appear.

<h3>The whole function code</h3>

You can get the whole function code from <a href="https://gist.github.com/ClaudioESSilva/dfaf1de2e5da88fca1e59f70edd7f4ae" rel="noopener" target="_blank">here</a>

<h3>A final curiosity</h3>

Normally when talking about automation one of the things that we measure is how much time we can save when in comparison with all the manual steps. Just to kill the curiosity the best case scenario for a manual process (which includes Excel files) takes 1h, after the automation we went down to 30 seconds. However this is a story for a another day with another blog post. Stay tuned!

Thanks for reading!
