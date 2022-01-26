import React, { useState } from "react";
import { Alert as BsAlert } from "react-bootstrap";

export default function Alert({ variant, dismissible, message, ...props }) {
  const [show, setShow] = useState(true);

  return (
    <BsAlert
      show={show}
      onClose={() => setShow(false)}
      variant={variant}
      dismissible={dismissible}
      className="my-3"
      {...props}
    >
      {message}
    </BsAlert>
  );
}
