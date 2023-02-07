import PrimarySearchAppBar from "./PrimarySearchAppBar";
import Typography from "@mui/material/Typography";

export default function ReaderApp() {
    return (
        <div>
            <PrimarySearchAppBar position="fixed" />
            <Typography component="h1" variant="h6">
                {[...new Array(50)]
                    .map(
                        () => `Cras mattis consectetur purus sit amet fermentum.
Cras justo odio, dapibus ac facilisis in, egestas eget quam.
Morbi leo risus, porta ac consectetur ac, vestibulum at eros.
Praesent commodo cursus magna, vel scelerisque nisl consectetur et.`
                    )
                    .join("\n")}
            </Typography>
        </div>
    );
}
