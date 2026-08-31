@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

<?php if(!isset($title) || (!$title && $title !== false)) $title = 'test'; if(!isset($description) || (!$description && $description !== false)) $description = 'Mô tả'; if(!isset($user) || (!$user && $user !== false)) $user = request()->user(); ?>
@let($test = 'demo')
@useState($userState, $user)
@useState($counter, 0)
@useState($posts, [
    ['title'=> 'title 1', 'description'=> 'Mô tả 1'],
    ['title'=> 'title 2', 'description'=> 'Mô tả 2'],
    ['title'=> 'title 3', 'description'=> 'Mô tả 3'],
    ])
@const([$userAvatar, $setAvatar] = useState(getUserAvatar($user)))
@extends($__template__ . 'main')
    @section('meta:type', 'article')
    @section('meta:og:image', 'https://vcc.vn/static/images/thumbnai.jpg')
    @block('footer')
        <div @class([$__VIEW_ID__ . '-8d67a825', 'footer-container'])>
            Footer Content
        </div>
    @endblock
    @block('content')
        <main @class([$__VIEW_ID__ . '-c15d19ee'])>
            <header @class([$__VIEW_ID__ . '-82685935'])>
                <nav @class([$__VIEW_ID__ . '-d422a1ee'])>
                    <a @class([$__VIEW_ID__ . '-a210c7f2', 'home', 'demo'=> $test]) @attr(['href' => route('web.home'), 'title' => siteinfo('site_name')])>
                        <img @class([$__VIEW_ID__ . '-a06724cf', 'site-logo', 'has-login'=> $userState]) @attr(['src' => asset('static/web/images/loho.png'), 'alt' => siteinfo('site_name')]) />
                    </a>
                    <ul @class([$__VIEW_ID__ . '-d16a45fe', 'site-menu'])>
                        @startMarker('reactive', 'bfdd0514', ['stateKey' => ['posts'], 'type' => 'foreach'])
                        @foreach($posts as $post)
                            <li @class([$__VIEW_ID__ . "-1bb2ea1b-{$loop->index}", 'menu-item', 'nav-item'])>
                                <a @class([$__VIEW_ID__ . "-2c9814f7-{$loop->index}", 'nav-link']) @attr(['href' => webPostUrl($post)])>
                                    @startMarker('output', "728bab78-{$loop->index}"){{ $post->title }}@endMarker('output', "728bab78-{$loop->index}")
                                </a>
                            </li>
                        @endforeach
                        @endMarker('reactive', 'bfdd0514')
                    </ul>
                    <div @class([$__VIEW_ID__ . '-425b92ca', 'account'])>
                        @startMarker('reactive', 'ddc1c38e', ['stateKey' => ['userState'], 'type' => 'if'])
                        @if($userState)
                            <a @class([$__VIEW_ID__ . '-c80ebe11', 'account-btn', 'btn-show-menu']) @attr(['href' => route('web.account'), 'data-menu-target' => 'account-menu'])>
                                <img @class([$__VIEW_ID__ . '-0aac2443', 'account-image', 'user-avatar']) @attr(['src' => getUserAvatar($userState), 'alt' => $userState->name]) />
                            </a>
                            <ul @class([$__VIEW_ID__ . '-6f8a7a2b', 'account-menu']) @attr(['id' => 'account-menu'])>
                                {{--  --}}
                                <li @class([$__VIEW_ID__ . '-232e1c8a'])><a @class([$__VIEW_ID__ . '-7d90d4a6']) @attr(['href' => route('web.account')])>{{ text('web.account.dashboard') }}</a></li>
                                <li @class([$__VIEW_ID__ . '-13761055'])><a @class([$__VIEW_ID__ . '-6767bb61']) @attr(['href' => route('web.account.profile')])>{{ text('web.account.profile') }}</a></li>
                                <li @class([$__VIEW_ID__ . '-ef6c6e87'])><a @class([$__VIEW_ID__ . '-0951f698']) @attr(['href' => route('web.account.change-avatar')])>{{ text('web.account.change-avatar') }}</a></li>
                                <li @class([$__VIEW_ID__ . '-d2255e78'])><a @class([$__VIEW_ID__ . '-e8c8a463']) @attr(['href' => route('web.account.signout')])>{{ text('web.account.signout') }}</a></li>
                            </ul>
                        @else
                            <a @class([$__VIEW_ID__ . '-089ad597']) @attr(['href' => route('web.account.signin')])>{{ text('web.account.signin') }}</a>
                            <a @class([$__VIEW_ID__ . '-16274139']) @attr(['href' => route('web.account.signup')])>{{ text('web.account.signup') }}</a>
                        @endif
                        @endMarker('reactive', 'ddc1c38e')
                    </div>
                </nav>

            </header>
            <h1 @class([$__VIEW_ID__ . '-52349a0a', 'page-title'])>{{ $title }}</h1>
            <p @class([$__VIEW_ID__ . '-5f02fa6e'])>{{ $description }}</p>
            <div @class([$__VIEW_ID__ . '-4478f7d8', 'card'])>
                <button @class([$__VIEW_ID__ . '-235ba5d3'])>@startMarker('output', '212ff7fa'){{ text('web.contents.clickme', ['counter'=> $counter]) }}@endMarker('output', '212ff7fa')</button>
            </div>

        </main>
    @endblock
