To start: run `npm i --legacy-peer-deps` (the flag is important).

To build, put your scripts in the scripts folder, and components in the components folder.

The script is what will run when the page is loaded--same as a normal content script but with the extra react functionality.

Declare your scripts in the manifest.json file (the one inside the react_content_scripts folder, NOT the other one).

To test your script, run `npm run build` inside react_content_scripts, or `npm run buildall` to build the entire extension, within the next-extension folder. 

Or, to build just the content scripts from the next-extension folder, run `npm run refreshcs` (this is the same as running npm run build inside react_content_scripts, just more convenient).

Once you've built successfully, just refresh the extension and go to the desired page.