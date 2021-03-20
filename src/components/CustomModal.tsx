import React from 'react';
import { Modal } from '@material-ui/core';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import QRCode from "react-qr-code";
import {Currency} from '../dtos/dtos';
import * as data from '../data/data';

import bitcoin from "../assets/images/bitcoin.png";
import ethereum from "../assets/images/ethereum.png";
import closeIcon from "../assets/images/close.png";

function getModalStyle() {
    const top = 50;
    const left = 50;
  
    return {
      top: `${top}%`,
      left: `${left}%`,
      transform: `translate(-${top}%, -${left}%)`,
    };
  }

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    paper: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      width: window.innerWidth < 768 ? '90%' : 400,
      backgroundColor: theme.palette.background.paper,
      border: '2px solid #000',
      boxShadow: theme.shadows[0],
      padding: theme.spacing(2, 4, 3),
    },
    currencyLogo: {
        width: 128,
        height: 128,
    },
    closeImg: {
        cursor:'pointer', 
        float:'right', 
        marginTop: 5, 
        width: 32,
    },
  }),
);

type Props = {
    isModalOpen: boolean;
    closeModal: any;
    title: string;
    currency: Currency;
};

function CustomModal (props: Props) {
    const classes = useStyles();
    const [modalStyle] = React.useState(getModalStyle);
    const {isModalOpen, closeModal, title, currency} = props;
    return(
        <Modal
            open={isModalOpen}
            onClose={closeModal}
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
            >
            <div style={modalStyle} className={classes.paper}>
                <img src={closeIcon} className={classes.closeImg} onClick={closeModal}/>
                <img src={currency === Currency.BTC ? bitcoin : ethereum} className={classes.currencyLogo}/>
                <h2 id="simple-modal-title">{title}</h2>
                <div>
                    {currency === Currency.BTC && 
                    <>
                        <p id="simple-modal-description">Scan the QR code and send the BTC</p>
                        <QRCode value={data.bitcoinAddress} />
                        <p id="simple-modal-description">Don't be crazy! do not send too much money</p>
                    </>
                    }
                    {currency === Currency.ETH && 
                        <>
                            <p id="simple-modal-description">Currently saving ETH to buy the name: </p>
                            <a href="https://app.ens.domains/name/alejandrobeancasas.eth">
                                https://app.ens.domains/name/alejandrobeancasas.eth
                            </a>
                            <p id="simple-modal-description">You can send ETH to a Test Network just for fun</p>
                            <QRCode value={data.ethereumAddress} />
                            <p id="simple-modal-description">Or to Mainnet if you have enough ETH.</p>
                        </>
                    }
                </div>
            
            </div>
         </Modal>
    );
}
            
export default CustomModal;