This is an example project showing how to run tests remotely in a Docker container
using an adapter script for the VS Code Mocha Test Explorer.

It contains 2 adapter scripts:
* `container-adapter.js` runs the tests in a docker container
* `host-adapter.js` runs the tests in the host - yes, this is rather pointless (the result should be exactly the same as if not using an adapter script at all) but may serve as a starting point for further experimentation

You can switch between these adapter scripts by changing the `mochaExplorer.adapterScript` configuration setting.

To run the tests in a docker container, you need to start the container using `docker-compose up -d` first.
