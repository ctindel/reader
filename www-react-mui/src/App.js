import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { RequireAuth, AuthProvider } from "react-auth-kit";
import LoginPage from "./LoginPage";
import Spinner from "./Spinner";
import ReaderApp from "./ReaderApp";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme();

const App = (props) => {
    return (
        <AuthProvider
            authType={"cookie"}
            authName={"_auth"}
            cookieDomain={window.location.hostname}
            cookieSecure={window.location.protocol === "https:"}
        >
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Spinner />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/app"
                        element={
                            <RequireAuth loginPath={"/login"}>
                                <ReaderApp />
                            </RequireAuth>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
