import QRCode from "react-qr-code";

interface QRCodeGeneratorProps {
    text: string;
};

export default function QRCodeGenerator (props: QRCodeGeneratorProps) {
 
    return (

        // Can be anything instead of `maxWidth` that limits the width.
        <div style={{ background: 'white', padding: '16px', height: "auto", margin: "0 auto", maxWidth: 150, width: "100%" }}>
            <QRCode
            size={256}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            value={props.text}
            viewBox={`0 0 256 256`}
            />
        </div>
    )
};

