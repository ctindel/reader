import React, { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import ReaderApp from "./ReaderApp";

const theme = createTheme();

const App = (props) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userInfo, setUserInfo] = useState({});
    const [userToken, setUserToken] = useState("");

    if (!isLoggedIn && sessionStorage.getItem("myUser")) {
        var tmpUser = sessionStorage.getItem("myUser");
        console.log("loading session user: " + tmpUser);
        var myUser = JSON.parse(tmpUser);
        if (sessionStorage.getItem("myToken")) {
            // Restore the contents of the text field
            var myToken = sessionStorage.getItem("myToken");
            console.log("loading session token: " + myToken);
            setUserInfo(myUser);
            setUserToken(myToken);
            setIsLoggedIn(true);
        } else {
            console.log(
                "Found a stored myUser object in sessionStorage but no myToken object"
            );
        }
    } else {
        console.log("There was no myUser object in sessionStorage");
    }

    const logout = () => {
        sessionStorage.removeItem("myUser");
        sessionStorage.removeItem("myToken");
        setIsLoggedIn(false);
        setUserInfo({});
        setUserToken("");
    };

    const onSuccess = (response) => {
        console.log(response);
        axios
            .post(`http://localhost:9000/api/v1.0/auth/google`, {
                credential: response.credential,
            })
            .then((res) => {
                console.log(
                    res.status + " result from calling /auth/google api"
                );
                console.log(res);
                if (res.status == 200) {
                    if (res.headers.get("x-auth-token")) {
                        var myToken = res.headers.get("x-auth-token");
                        var myUser = res.data;
                        console.log(res.headers["x-auth-token"]);
                        setIsLoggedIn(true);
                        setUserInfo(myUser);
                        setUserToken(myToken);
                        sessionStorage.setItem(
                            "myUser",
                            JSON.stringify(myUser)
                        );
                        sessionStorage.setItem("myToken", myToken);
                    } else {
                        console.log("No x-auth-token header found in response");
                    }
                }
            });
    };

    const onError = () => {
        console.log("Error with useGoogleLogin");
        setIsLoggedIn(false);
        setUserInfo({});
        setUserToken("");
    };

    console.log("isLoggedIn: " + isLoggedIn);
    return (
        <div>
            <GoogleOAuthProvider clientId="104972086559-jdn01f6df88cne9ip3qduc205u1p1p3r.apps.googleusercontent.com">
                {isLoggedIn ? (
                    <ReaderApp />
                ) : (
                    <ThemeProvider theme={theme}>
                        <Container component="main" maxWidth="xs">
                            <CssBaseline />
                            <Box
                                sx={{
                                    marginTop: 8,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                }}
                            >
                                <Avatar
                                    sx={{ m: 1, bgcolor: "secondary.main" }}
                                >
                                    <LockOutlinedIcon />
                                </Avatar>
                                <Typography component="h1" variant="h6">
                                    If you don't see a Sign in With Google
                                    Button, try disabling your ad blocker or
                                    privacy badger extension for this site.
                                </Typography>

                                <GoogleLogin
                                    onSuccess={onSuccess}
                                    onError={onError}
                                ></GoogleLogin>
                            </Box>
                        </Container>
                    </ThemeProvider>
                )}
            </GoogleOAuthProvider>
        </div>
    );
};

export default App;
