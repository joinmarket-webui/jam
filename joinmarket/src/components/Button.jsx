import React from "react";
import "./button.css";

export const Button = ({name,children, type, onClick, buttonStyle, buttonSize}) => {
    return (
        <button onClick = {()=>onClick(name)} type = {type}>
            {children}
        </button>
    )
}

