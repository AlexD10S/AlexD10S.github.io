import React, {useState} from 'react';
import "./SocialNetworks.css";
import {IconRRSS, Currency} from '../../dtos/dtos';
import CustomModal from '../CustomModal';

type Props = {
    icons: IconRRSS[];
};

function SocialNetworks (props: Props){
    const [isModalOpen, handleModal] = useState(false);
    const {icons} = props;
    return (
        <>
        <CustomModal 
            isModalOpen={isModalOpen}
            closeModal={()=> handleModal(false)}
            title={"alejandrobeancasas.eth"}
            currency={Currency.ETH} />

        <div className="icons-social">
        <a
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleModal(true)}
        >
            <i className={ `fab fa-ethereum` } />
        </a>
          {icons.map(icon => (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={ `${icon.url}` }
            >
              <i className={ `fab ${icon.image}` } />
            </a>
          ))}
        </div>
        </>
    );
}

export default SocialNetworks;