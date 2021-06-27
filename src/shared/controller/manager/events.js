import { VdsCustomEvent } from '../../events/index.js';
import { ManagedController } from './ManagedController.js';

/**
 * @typedef {{
 *  controller: ManagedController;
 *  onDisconnect: (callback: () => void) => void;
 * }} ManagedControllerConnectEventDetail
 */

/**
 * @typedef {{
 *  [ManagedControllerConnectEvent.TYPE]: ManagedControllerConnectEvent;
 * }} ControllerManagerEvents
 */

/**
 * @extends VdsCustomEvent<ManagedControllerConnectEventDetail>
 * @bubbles
 * @composed
 */
export class ManagedControllerConnectEvent extends VdsCustomEvent {
	/** @readonly */
	static TYPE = 'vds-managed-controller-connect';

	/**
	 * @param {import('../../events').VdsEventInit<ManagedControllerConnectEventDetail>} eventInit
	 */
	constructor(eventInit) {
		super(ManagedControllerConnectEvent.TYPE, {
			bubbles: true,
			composed: true,
			...eventInit
		});
	}
}
