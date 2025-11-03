"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "./utils";
import styles from "./Modal.module.css";

const Modal = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalPortal = DialogPrimitive.Portal;
const ModalClose = DialogPrimitive.Close;

type ModalOverlayProps = React.ComponentProps<typeof DialogPrimitive.Overlay>;

function ModalOverlay({ className, ...props }: ModalOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      data-slot="modal-overlay"
      className={cn(styles.overlay, className)}
      {...props}
    />
  );
}

type ModalSize = "sm" | "md" | "lg";

type ModalContentProps = React.ComponentProps<
  typeof DialogPrimitive.Content
> & {
  size?: ModalSize;
};

function ModalContent({
  children,
  className,
  size = "md",
  ...props
}: ModalContentProps) {
  return (
    <ModalPortal>
      <ModalOverlay />
      <DialogPrimitive.Content
        data-slot="modal-content"
        data-size={size}
        className={cn(styles.content, styles[size], className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className={styles.closeButton}>
          <XIcon aria-hidden="true" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </ModalPortal>
  );
}

interface ModalHeaderProps extends React.ComponentProps<"div"> {
  align?: "left" | "center";
}

function ModalHeader({
  className,
  align = "left",
  ...props
}: ModalHeaderProps) {
  return (
    <div
      data-slot="modal-header"
      data-align={align === "center" ? "center" : undefined}
      className={cn(styles.header, className)}
      {...props}
    />
  );
}

interface ModalBodyProps extends React.ComponentProps<"div"> {
  tight?: boolean;
}

function ModalBody({ className, tight = false, ...props }: ModalBodyProps) {
  return (
    <div
      data-slot="modal-body"
      data-tight={tight ? "true" : undefined}
      className={cn(styles.body, className)}
      {...props}
    />
  );
}

interface ModalFooterProps extends React.ComponentProps<"div"> {
  direction?: "row" | "column";
}

function ModalFooter({
  className,
  direction = "column",
  ...props
}: ModalFooterProps) {
  return (
    <div
      data-slot="modal-footer"
      data-direction={direction === "row" ? "row" : undefined}
      className={cn(styles.footer, className)}
      {...props}
    />
  );
}

function ModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="modal-title"
      className={cn(styles.title, className)}
      {...props}
    />
  );
}

function ModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="modal-description"
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

export {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalPortal,
  ModalTitle,
  ModalTrigger,
};
