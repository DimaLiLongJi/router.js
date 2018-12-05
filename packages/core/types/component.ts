import { DirectiveList, IDirective } from './directive';
import { Watcher } from '../watcher';
import { Injector } from '../di';
import { RenderTaskQueue } from '../render';

export type ComponentList<C> = {
    dom: Node;
    props: any;
    scope: C;
    constructorFunction: Function;
    hasRender: boolean;
};

export interface IComponent<State = any, Props = any, Vm = any> {
    state?: State | any;
    props?: Props | any;
    renderNode?: Element | any;
    $indivInstance?: Vm | any;
    stateWatcher?: Watcher;
    renderTaskQueue?: RenderTaskQueue;

    template?: string;
    declarationMap?: Map<string, Function>;
    componentList?: ComponentList<IComponent<any, any, any>>[];
    directiveList?: DirectiveList<IDirective<any, any>>[];
    otherInjector?: Injector;
    privateInjector?: Injector;

    nvOnInit?(): void;
    watchData?(): void;
    nvBeforeMount?(): void;
    nvAfterMount?(): void;
    nvOnDestory?(): void;
    nvHasRender?(): void;
    nvWatchState?(oldState?: any): void;
    nvRouteChange?(lastRoute: string, newRoute: string): void;
    nvReceiveProps?(nextProps: Props): void;
    render?(): Promise<IComponent<State, Props, Vm>>;
    compiler?(renderNode: Element | any, componentInstace: IComponent): Promise<IComponent>;
}