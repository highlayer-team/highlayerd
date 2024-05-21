const fs = require('fs');
const path = require('path');

function loadStructsModule(_app, carrier) {
    try {
      
        carrier.structs = {};


        const structsPath = path.join(__dirname, ".." ,'structs');

        
        fs.readdirSync(structsPath).forEach(file => {
            if (path.extname(file) === '.js') {
            
                const structName = path.basename(file, '.js');

                carrier.structs[structName] = require(path.join(structsPath, file));
            }
        });

    } catch (err) {
        console.error('Failed to load structures:', err);
        throw err; 
    }
}

module.exports = loadStructsModule;
