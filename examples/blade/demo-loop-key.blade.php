@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

<?php if(!isset($posts) || (!$posts && $posts !== false)) $posts = []; if(!isset($categories) || (!$categories && $categories !== false)) $categories = []; if(!isset($postCategories) || (!$postCategories && $postCategories !== false)) $postCategories = []; if(!isset($postTags) || (!$postTags && $postTags !== false)) $postTags = []; if(!isset($postAuthors) || (!$postAuthors && $postAuthors !== false)) $postAuthors = []; ?>
@useState($postList, $posts)
@useState($categoryList, $categories)
@let($i = 0)
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'flex', 'flex-col', 'gap-2'])>
        @for($i = 0; $i < 10; $i++)
            <div @class([$__VIEW_ID__ . "-75512120-{$i}", 'flex', 'items-center', 'gap-2'])>
                <h2 @class([$__VIEW_ID__ . "-7ac578e1-{$i}", 'text-sm'])>Title @startMarker('output', "1eebdc03-{$i}"){{ $i }}@endMarker('output', "1eebdc03-{$i}")</h2>
                @startMarker('reactive', "042330d2-{$i}", ['stateKey' => ['categoryList'], 'type' => 'foreach'])
                @foreach($categoryList as $categoryItem)
                    <div @class([$__VIEW_ID__ . "-af0882bc-{$i}-{$categoryItem->id}", 'category-item'])>
                        <h3 @class([$__VIEW_ID__ . "-e8dfa113-{$i}-{$categoryItem->id}", 'category-name'])>@startMarker('output', "07ace25f-{$i}-{$categoryItem->id}"){{ $categoryItem->name }}@endMarker('output', "07ace25f-{$i}-{$categoryItem->id}")</h3>
                        <div @class([$__VIEW_ID__ . "-155bb96c-{$i}-{$categoryItem->id}", 'post-list'])>
                            @foreach($categoryItem->posts as $postItem)
                                <div @class([$__VIEW_ID__ . "-89e1e39d-{$i}-{$categoryItem->id}-{$postItem->id}", 'post-item'])>
                                    <h4 @class([$__VIEW_ID__ . "-5a44d3c4-{$i}-{$categoryItem->id}-{$postItem->id}", 'post-title'])>@startMarker('output', "9a1192be-{$i}-{$categoryItem->id}-{$postItem->id}"){{ $postItem->title }}@endMarker('output', "9a1192be-{$i}-{$categoryItem->id}-{$postItem->id}")</h4>
                                    <p @class([$__VIEW_ID__ . "-2b659ba4-{$i}-{$categoryItem->id}-{$postItem->id}", 'post-content'])>@startMarker('output', "6584e3ba-{$i}-{$categoryItem->id}-{$postItem->id}"){{ $postItem->content }}@endMarker('output', "6584e3ba-{$i}-{$categoryItem->id}-{$postItem->id}")</p>
                                </div>
                            @endforeach
                        </div>
                    </div>
                @endforeach
                @endMarker('reactive', "042330d2-{$i}")
            </div>
        @endfor
    </div>
@endWrapper
