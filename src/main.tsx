import { render } from 'preact';
import { Root } from './ui/App';
import { captureInstallPrompt, requestPersistence } from './ui/device';
import './styles.css';

captureInstallPrompt();
void requestPersistence();

render(<Root />, document.getElementById('app')!);
