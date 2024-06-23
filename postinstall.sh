git submodule update --init --recursive
cd bcoin
echo "Installing bcoin deps"
npm install
cd ../weselowski-vdf-native.js/go 
go build -o ../include/libvdf.so -buildmode=c-shared lib.go
echo "Built libvdf.so"
cd ..
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(pwd)/include
npm run build-binding