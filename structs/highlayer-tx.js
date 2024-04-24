const cbor = require("cbor");
const crypto = require("crypto");
const config = require("../config.json")
const ed25519 = require("bcrypto/lib/ed25519");
const { base58 } = require("bstring");
const bip322 = require("bip322-js")
class HighlayerTx {
    constructor({
        address,
        signature,
        nonce,
        actions,
        bundlePosition,
        ledgerPosition,
        parentBundleHash,
        sequencerSignature,
    }) {
        this.address = address || "";
        this.signature = signature || null;
        this.nonce = nonce || crypto.randomBytes(4).readUInt32BE(0);
        this.actions = actions || [];
        this.bundlePosition = bundlePosition || null;
        this.ledgerPosition = ledgerPosition || null;
        this.parentBundleHash = parentBundleHash || null;
        this.sequencerSignature = sequencerSignature || null;
    }

    encode() {
        return base58.encode(
            cbor.encode({
                address: this.address,
                signature: this.signature,
                nonce: this.nonce,
                actions: this.actions,
                bundlePosition: this.bundlePosition,
                ledgerPosition: this.ledgerPosition,
                parentBundleHash: this.parentBundleHash,
                sequencerSignature: this.sequencerSignature,
            })
        );
    }

    extractPrototype() {
        return base58.encode(
            cbor.encode({
                address: this.address,
                signature: null,
                nonce: this.nonce,
                actions: this.actions,
                bundlePosition: null,
                ledgerPosition: null,
                parentBundleHash: null,
                sequencerSignature: null,
            })
        );
    }

    static decode(base58encoded) {
        const buffer = base58.decode(base58encoded);
        const decodedObject = cbor.decodeFirstSync(buffer);
        return new HighlayerTx({
            address: decodedObject.address,
            signature: decodedObject.signature,
            nonce: decodedObject.nonce,
            actions: decodedObject.actions,
            bundlePosition: decodedObject.bundlePosition,
            ledgerPosition: decodedObject.ledgerPosition,
            parentBundleHash: decodedObject.parentBundleHash,
            sequencerSignature: decodedObject.sequencerSignature,
        });
    }
    static verifySignatures(encodedHighlayerTx) {
        const sequencerUnsigned = Buffer.from(new HighlayerTx({ ...encodedHighlayerTx, sequencerSignature: null }).encode())
        const dataHash = crypto.createHash("sha256").update(sequencerUnsigned).digest();
        const isSequencerSignatureValid = ed25519.verify(
            dataHash,
            base58.decode(encodedHighlayerTx.sequencerSignature),
            Buffer.from(config.sequencerPubkey, "hex")
        );
        const isEOASignatureValid = bip322.Verifier.verifySignature(encodedHighlayerTx.address, encodedHighlayerTx.extractPrototype(), encodedHighlayerTx.signature)

        return isEOASignatureValid && isSequencerSignatureValid;

    }
}

module.exports = { HighlayerTx };
