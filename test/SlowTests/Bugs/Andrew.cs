// -----------------------------------------------------------------------
//  <copyright file="Andrew.cs" company="Hibernating Rhinos LTD">
//      Copyright (c) Hibernating Rhinos LTD. All rights reserved.
//  </copyright>
// -----------------------------------------------------------------------

using System.Collections.Generic;
using System.Linq;
using System.Threading;
using FastTests;
using Raven.NewClient.Client.Data;
using Raven.NewClient.Client.Data.Queries;
using Raven.NewClient.Client.Indexes;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace SlowTests.Bugs
{
    public class Andrew :  RavenNewTestBase
    {
        private class User { }
        private class Car { }

        private class MyIndex : AbstractIndexCreationTask<User>
        {
            public MyIndex()
            {
                Map = users =>
                    from user in users
                    select new {A = LoadDocument<Car>("cars/1"), B = LoadDocument<Car>("cars/2"), ForceIndexRow = 1};
            }
        }

        [Fact]
        public void FunkyIndex()
        {
            using (var store = GetDocumentStore())
            {
                using (var session = store.OpenSession())
                {
                    session.Store(new User());
                    session.SaveChanges();
                }

                new MyIndex().Execute(store);

                WaitForIndexing(store);

                var firstQueryResult = store.Commands().Query("MyIndex", new IndexQuery(store.Conventions));

                Assert.Equal(1, firstQueryResult.TotalResults);

                var cts = new CancellationTokenSource();


                var car1 = Task.Factory.StartNew(() =>
                {
                    while (cts.IsCancellationRequested == false)
                    {
                        store.Commands().Delete("cars/1", null);
                        Thread.Sleep(31);
                        store.Commands().Put("cars/1", null, new object(), new Dictionary<string, string>());

                    }
                });
                var car2 = Task.Factory.StartNew(() =>
                {
                    while (cts.IsCancellationRequested == false)
                    {
                        store.Commands().Delete("cars/2", null);
                        Thread.Sleep(17);
                        store.Commands().Put("cars/2", null, new object(), new Dictionary<string, string>());
                    }
                });


                for (int i = 0; i < 100; i++)
                {
                    QueryResult queryResult = store.Commands().Query("MyIndex", new IndexQuery(store.Conventions));

                    Assert.Equal(1, queryResult.TotalResults);
                }

                cts.Cancel();

                car1.Wait();
                car2.Wait();


                QueryResult finalQueryResult = store.Commands().Query("MyIndex", new IndexQuery(store.Conventions));

                Assert.Equal(1, finalQueryResult.TotalResults);
            }
        }
    }
}
