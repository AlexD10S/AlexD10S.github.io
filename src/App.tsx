
import './App.css';
import Typist from 'react-typist';
import { Avatar } from '@material-ui/core';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import Footer from './components/Footer/Footer';
import SocialNetworks from './components/SocialNetworks/SocialNetworks';
import * as data from './data/data';

import avatar from "./assets/images/avatar.jpg";


const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    large: {
      width: theme.spacing(20),
      height: theme.spacing(20),
      marginTop: '5%',
    },
  }),
);

function App() {
  const classes = useStyles();
  return (
      <div className="App-main">
        <Avatar alt="Alejandro Bean" src={avatar} className={classes.large}/>
        <div className="fading-1"><h1 className="greeting">Hi, I am Alejandro Bean! &#128075;</h1></div>
        <div className="tagline">
          <Typist>{"Software Engineer | Full Stack Developer | Blockchain Enthusiast | Master's Student" }</Typist>
        </div>

        <SocialNetworks icons={data.icons}/>
        <Footer />
      </div>

  );
}

export default App;
