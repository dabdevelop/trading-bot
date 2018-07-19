"use strict";

var Promise = require("bluebird");
// Step 0: Configure Network and Path
var Nebulas = require("nebulas"),
    Account = Nebulas.Account,
    Neb = Nebulas.Neb,
    Utils = Nebulas.Utils,
    Unit = Nebulas.Unit,
    neb = new Neb();

var nonces = {}

function batchGenerateWallets(amount, passphrase, callback){
    const fs = require('fs');
    var accounts = [];
    try {
        accounts = require(path + "accounts.json")
    } catch (err){
        console.log("No exist accounts detected");
    }
    var length = accounts.length;
    if(amount > length){
        for(var i = 0; i < amount - length; i++){
            var acc = Account.NewAccount();
            var address = acc.getAddressString();
            var key = acc.toKey(passphrase);

            fs.writeFileSync(path + address + ".json", JSON.stringify(key), function(err) {
                if(err) {
                    return console.log(err);
                }
            });
            accounts.push(address);
            console.log("The key " + address + ".json" + " was saved!");
        }
        fs.writeFileSync(path + "accounts.json", JSON.stringify(accounts), function(err) {
            if(err) {
                return console.log(err);
            }
        });
    }
    callback();
}

function transfer(passphrase){
    var accounts = require(path + "accounts.json");
    var i = getRandomInt(0, accounts.length - 1);
    var key = JSON.stringify(require(path + accounts[i] + ".json"));
    var acc = new Account();
    try {
        acc = acc.fromKey(key, passphrase, true);
        neb.api.getNebState().then((nebstate) => {
            let address = acc.getAddressString();
            neb.api.getAccountState(address).then((accstate) => {
                if(Unit.fromBasic(accstate.balance, "nas").toNumber() > 10){
                    let _value = Unit.nasToBasic(Utils.toBigNumber(getRandomInt(Math.floor(Unit.fromBasic(accstate.balance / 2, "nas").toNumber()), Math.floor(Unit.fromBasic(accstate.balance, "nas").toNumber())) - getRandomInt(0, 9) / 10)); // random NAS
                    if(typeof nonces[address] === 'undefined'){
                        nonces[address] = parseInt(accstate.nonce);
                    }
                    nonces[address] =  nonces[address] + 1;
                    let _nonce = nonces[address];
                    let _to = accounts[getRandomInt(0, accounts.length - 1)];
                    //generate transfer information
                    var Transaction = Nebulas.Transaction;
                    var tx = new Transaction({
                        chainID: nebstate.chain_id,
                        from: acc,
                        to: _to,
                        value: _value,
                        nonce: _nonce,
                        gasPrice: 1000000,
                        gasLimit: 2000000
                    });
                    tx.signTransaction();
                    //send a transfer request to the NAS node
                    neb.api.sendRawTransaction({
                        data: tx.toProtoString()
                    }).then((result) => {
                        let txhash = result.txhash;
                        let trigger = setInterval(() => {
                            try{
                                neb.api.getTransactionReceipt({hash: txhash}).then((receipt) => {
                                    console.log('Pending transaction ...');
                                    if (receipt.status != 2) //not in pending
                                    {
                                        console.log(JSON.stringify(receipt));
                                        clearInterval(trigger);
                                    }
                                });
                            } catch(err){
                                console.log(err);
                                clearInterval(trigger);
                            }
                        }, 5000);
                    });
                } else {
                    console.log("Escape " + address + " balance less than 10 NAS.");
                    transfer(passphrase);
                }
            });
        });
    } catch (err) {
        console.log(err.message);
    }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function batchTransfer(times, passphrase){
    var done = 0;
    let worker = setInterval(() => {
        if (done >= times) // batch work done
        {
            clearInterval(worker);
        }
        console.log('Start transfer ' + (done + 1));
        transfer(passphrase);
        done ++;
    }, 240000);
}

function queryTotalBalance(){
    var accounts = require(path+"accounts.json");
    var balance = 0;
    var wallets = 0;
    for(var i in accounts){
        try {
            let address = accounts[i];
            neb.api.getAccountState(address).then((accstate) => {
                var b = Unit.fromBasic(accstate.balance, "nas").toNumber();
                if(b > 0){
                    balance += b;
                    wallets ++;
                    console.log(address + " : " + b + " NAS.");
                    console.log("Total Balance: " + balance + " NAS in " + wallets + " wallets.");
                }
            });
        } catch(err){
            console.log(err);
        }
    }
}


function callContract(passphrase){
    var accounts = require(path + "accounts.json");
    var contractAddress = "n1sr4JA4e9QPB4opLk2Kjmp8NkP6GGoAmnt";
    // var contractAddress = "n1kVKK53C85Cu6PBkgE8Qvch9ym5GxnDSWr";

    // var i = getRandomInt(0, accounts.length - 1);
    // while (called.includes(i)){
    //     i = getRandomInt(0, accounts.length - 1);
    // }
    // called.push(i);
    // var key = JSON.stringify(require(path + accounts[i] + ".json"));
    var key = JSON.stringify(require(path + accounts[0] + ".json"));
    var acc = new Account();
    try {
        acc = acc.fromKey(key, passphrase, true);
        neb.api.getNebState().then((nebstate) => {
            let address = acc.getAddressString();
            neb.api.getAccountState(address).then((accstate) => {
                if(Unit.fromBasic(accstate.balance, "nas").toNumber() >= 1){
                    let value = 0;
                    var fun = '';
                    var args = [];
                    var action = getRandomInt(0, 0);
                    let amount = 0;
                    if(action == 0){
                       fun = 'buy';
                       // value = getRandomInt(1, 10) * Math.pow(10, 17);
                       // 这里修改单次买入数量，最多10
                        value = 1 * Math.pow(10, 18)
                    } else{
                       fun = 'sell';
                       value = 0;
                       amount = getRandomInt(200, 500);
                       args.push(amount)
                    }

                    // var fun = 'login';
                    // var args = [];

                    value = Unit.fromBasic(value, 'nas');
                   

                    let _value = Unit.toBasic(value);
                    if(typeof nonces[address] === 'undefined'){
                        nonces[address] = parseInt(accstate.nonce);
                    }
                    nonces[address] =  nonces[address] + 1;
                    let _nonce = nonces[address];
                    let _to = contractAddress;
                    let _gasPrice = 1000000;
                    let _gasLimit = 2000000;
                    let _contract = {
                        "function": fun,
                        "args": JSON.stringify(args)
                    };

                    //generate transaction information
                    var Transaction = Nebulas.Transaction;
                    var tx = new Transaction({
                        chainID: nebstate.chain_id,
                        from: acc,
                        to: _to,
                        value: _value,
                        nonce: _nonce,
                        gasPrice: _gasPrice,
                        gasLimit: _gasLimit,
                        contract: _contract
                    });
                    tx.signTransaction();
                    console.log(address + ' call ' + contractAddress + ' @ ' + _contract.function + ": " +JSON.stringify(_contract.args) + ' with value: ' + value);
                    //send a transfer request to the NAS node

                    neb.api.sendRawTransaction({
                        data: tx.toProtoString()
                    }).then((result) => {
                        let txhash = result.txhash;
                        let trigger = setInterval(() => {
                            try{
                                neb.api.getTransactionReceipt({hash: txhash}).then((receipt) => {
                                    if (receipt.status != 2) //not in pending
                                    {
                                        console.log(JSON.stringify(receipt));
                                        clearInterval(trigger);
                                    }
                                });
                            } catch(err){
                                console.log(err);
                                clearInterval(trigger);
                            }
                        }, 5000);
                    });

                } else {
                    console.log("Escape " + address + " balance less than 1 NAS.");
                }
            });

        });
    } catch (err) {
        console.log(err.message);
    }
}

function intervalCall(times, done, passphrase){
    //console.log('Start callContract ' + (done + 1));
    callContract(passphrase);
    done ++;
    clearInterval(timer);
    if(done < times){
        var waitMinutes = getRandomInt(5, 10);
        console.log("Wait " + waitMinutes + " Seconds");
        timer = setInterval(intervalCall, waitMinutes * 1000, times, done, passphrase);
    }
}

neb.setRequest(new Nebulas.HttpRequest("https://mainnet.nebulas.io"));
var path = "./accounts/";

// Step 1: Batch generate wallets

var amounts = 50000;
// 这里修改你的keystore密码
var passphrase = "password";
var timer;
var called = [];

//new Promise(function(resolve, reject) {
//    batchGenerateWallets(amounts, passphrase, resolve);
//}).then(() => {
//    // Step 2: Send NAS to generated wallets
//
//    // Step 3: Transfer NAS from wallets to wallets
//    batchTransfer(Math.floor(amounts * amounts / 2), passphrase);
//
//    //Step 4: Interval call contract
//    timer = setInterval(intervalCall, 15000, amounts, 0, passphrase);
//});



//timer = setInterval(intervalCall, 15000, amounts, 0, passphrase);

//queryTotalBalance();

timer = setInterval(intervalCall, 3000, amounts, 0, passphrase);
