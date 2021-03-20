import { useState }  from 'react';
import CustomModal from '../CustomModal';
import "./Footer.css";
import {Currency} from '../../dtos/dtos';

function Footer() {
    const [isModalOpen, handleModal] = useState(false);
    return (
        <footer className="footer">
        <CustomModal 
            isModalOpen={isModalOpen}
            closeModal={()=> handleModal(false)}
            title={"Thanks!"}
            currency={Currency.BTC} />
        <div className="footerLeft">
              <p onClick={() => handleModal(true)}>
                You can grab me a beer  &#127867; with <i className={ `fab fa-bitcoin` } style={{color: "#f7931a"}}/>
              </p>
          </div>
          <div className="footerRight">
              <p>
                &#169; Alejandro Bean Casas. 
              </p>
          </div>
      </footer>
    );
}

export default Footer;