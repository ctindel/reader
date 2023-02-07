import React, { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";

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

    const onSuccess = (response) => {
        console.log(response);
        axios
            .post(`http://localhost:9000/api/v1.0/auth/google`, {
                credential: response.credential,
            })
            .then((res) => {
                console.log(
                    res.status + "result from calling /auth/google api"
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
                    <>
                        <p>Welcome {userInfo.email}!</p>
                    </>
                ) : (
                    <GoogleLogin
                        onSuccess={onSuccess}
                        onError={onError}
                    ></GoogleLogin>
                )}
            </GoogleOAuthProvider>
        </div>
    );
};

export default App;
