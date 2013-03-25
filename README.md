QIMP
====

License
------------------
This software is liscensed dual licensed under  MIT and GPL3 licenses
Contact BoomTown for additional licensing options.
© BoomTown 2013


Installing and Running
---------------------
Installing and running QIMP is easy.

First install mongo and make sure the mongo is running. You will need to run the following two commands to import the provided questions and data

<pre><code>
mongoimport -d qimp -c questions data/questions.json
mongoimport -d qimp -c settings data/settings.json
</code></pre>

then simply run

<pre><code>node server.js</code></pre>
you can pass in an optional value for the port with the -p flag, QIMP runs by default on port 8088


